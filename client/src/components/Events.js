import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import EventCard from './EventCard';
import EventModal from './EventModal';
import '../Events.css';
import { getBookmarkStorageKeys } from '../utils/bookmarkStorage';
import { apiFetch } from '../utils/api';

// Events are loaded from MongoDB via GET /api/events
// Seed data: node server/seeders/seedEvents.js

// v2 = bumped to force-clear old cache that may contain personal events
const EVENTS_CACHE_KEY = 'clockdin_events_cache_v2';
const EVENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Legitimate event sources from scrapers/admin — NOT user-created personal events
const LEGIT_SOURCES = ['unstop', 'devfolio', 'internshala', 'hackerearth', 'manual', 'scraper'];

/**
 * Returns true if the event is a public/legit event.
 * Filters out personal events created via MyEvents page.
 */
const isPublicEvent = (e) => {
  const org = (e.organization || '').trim().toLowerCase();
  // Explicitly tagged as personal
  if (org === 'personal') return false;
  // Created by a user with no legit scraper source = personal event leaked into DB
  const src = (e.source || '').trim().toLowerCase();
  if (e.createdBy && !LEGIT_SOURCES.includes(src)) return false;
  return true;
};

const getCachedEvents = () => {
  try {
    const raw = localStorage.getItem(EVENTS_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    // Also apply isPublicEvent filter to cached data to remove any old personal events
    const filtered = Array.isArray(data) ? data.filter(isPublicEvent) : data;
    if (Date.now() - ts < EVENTS_CACHE_TTL) return filtered;
    return filtered; // return stale data — still better than blank
  } catch (_) { return null; }
};

const setCachedEvents = (data) => {
  try {
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}
};

// Also clear old v1 cache
try { localStorage.removeItem('clockdin_events_cache_v1'); } catch (_) {}

const isValidObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

const Events = () => {
  // ── API-powered event state ───────────────────────────────────
  const cachedOnMount = useMemo(() => getCachedEvents(), []);
  const [events, setEvents] = useState(cachedOnMount || []);
  // If we have cached data show it immediately; only show spinner on truly fresh load
  const [eventsLoading, setEventsLoading] = useState(!cachedOnMount);
  const [eventsError, setEventsError] = useState(null);
  // ─────────────────────────────────────────────────────────────

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickPreset, setQuickPreset] = useState('');
  const [modeFilters, setModeFilters] = useState([]);
  const [levelFilters, setLevelFilters] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('soonest');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const CARDS_PER_PAGE = 12;

  // ── Fetch events from MongoDB API — cache-first, refresh in background ──
  const fetchEvents = useCallback(async () => {
    setEventsError(null);
    try {
      const res = await apiFetch('/api/events?limit=200');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      let raw = [];
      if (json.success && json.data && json.data.events) {
        raw = json.data.events;
      } else if (Array.isArray(json)) {
        raw = json;
      }

      // Client-side: filter out events whose deadline has already passed
      // AND filter out any personal events that may have leaked from MyEvents page
      const now = new Date();
      const upcoming = raw.filter(e => {
        if (!isPublicEvent(e)) return false; // ← strip personal events
        if (!e.deadline) return true; // no deadline = show it
        return new Date(e.deadline) >= now;
      });

      setEvents(upcoming);
      setCachedEvents(upcoming);
    } catch (err) {
      console.error('[Events] Failed to fetch events:', err.message);
      // Only show error if we have no data at all to show
      if (!cachedOnMount) {
        setEventsError('Failed to load events. Please refresh the page.');
        setEvents([]);
      }
    } finally {
      setEventsLoading(false);
    }
  // eslint-disable-next-line
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  // ─────────────────────────────────────────────────────────────

  // Set category from navigation state
  useEffect(() => {
    if (location.state && location.state.category) {
      setActiveCategory(location.state.category);
    }
  }, [location.state]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventId = params.get('eventId');
    if (!eventId) return;
    const normalizedId = eventId.toString();
    const matchingEvent = events.find(ev => {
      const identifiers = [ev._id, ev.id, ev.title]
        .filter(Boolean)
        .map(id => id.toString());
      return identifiers.includes(normalizedId);
    });
    if (matchingEvent) {
      setSelectedEvent(matchingEvent);
      setIsModalOpen(true);
    }
  }, [location.search, events]);

  // Bookmark logic
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    const { idsKey } = getBookmarkStorageKeys();
    const saved = localStorage.getItem(idsKey);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const refresh = () => {
      const { idsKey } = getBookmarkStorageKeys();
      const saved = localStorage.getItem(idsKey);
      setBookmarkedIds(saved ? JSON.parse(saved) : []);
    };
    const onStorage = (e) => {
      if (!e.key || e.key.includes('bookmarkedEvents') || e.key === 'clockdin_user') refresh();
    };
    refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('bookmarks-changed', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('bookmarks-changed', refresh);
    };
  }, []);

  const popularTags = useMemo(() => {
    const tagSet = new Set();
    events.forEach(ev => (ev.tags || []).forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).slice(0, 14);
  }, [events]);

  const toggleValue = (list, value) => (
    list.includes(value) ? list.filter(v => v !== value) : [...list, value]
  );

  const formatInputDate = (date) => date.toISOString().split('T')[0];
  const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

  const handlePresetSelect = (preset) => {
    const today = new Date();
    setQuickPreset(preset);
    if (preset === '7d') {
      setStartDate(formatInputDate(today));
      setEndDate(formatInputDate(addDays(today, 7)));
    } else if (preset === '30d') {
      setStartDate(formatInputDate(today));
      setEndDate(formatInputDate(addDays(today, 30)));
    } else if (preset === 'weekend') {
      const day = today.getDay();
      const saturday = addDays(today, (6 - day + 7) % 7);
      setStartDate(formatInputDate(saturday));
      setEndDate(formatInputDate(addDays(saturday, 1)));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const clearAllFilters = () => {
    setGlobalSearch('');
    setActiveCategory('all');
    setStartDate('');
    setEndDate('');
    setQuickPreset('');
    setModeFilters([]);
    setLevelFilters([]);
    setSelectedTags([]);
    setSortBy('soonest');
    setBookmarkedOnly(false);
  };


  // ── Filtering ─────────────────────────────────────────────────
  let filteredEvents = events.filter(event => {
    const deadlineDate = event.deadline ? new Date(event.deadline) : null;

    // Category filter
    if (activeCategory !== 'all') {
      const typeMap = {
        Hackathon: 'hackathon',
        Internship: 'internship',
        Workshop: 'workshop',
        'Student Competition': 'competition',
        Seminar: 'seminar',
      };
      const eventType = (event.type || event.category || '').toLowerCase();
      if (activeCategory in typeMap && eventType !== typeMap[activeCategory]) return false;
    }

    // Date range filters (by deadline)
    if (startDate && deadlineDate) {
      if (deadlineDate < new Date(startDate)) return false;
    }
    if (endDate && deadlineDate) {
      if (deadlineDate > new Date(endDate)) return false;
    }

    // Mode filter
    if (modeFilters.length) {
      const modeLower = (event.mode || '').toLowerCase();
      if (!modeFilters.some(m => modeLower.includes(m))) return false;
    }

    // Skill level filter
    if (levelFilters.length) {
      const difficulty = (event.difficulty || event.skillLevel || '').toLowerCase();
      if (!levelFilters.includes(difficulty)) return false;
    }

    // Tags filter
    if (selectedTags.length) {
      const tags = (event.tags || []).map(t => t.toLowerCase());
      if (!selectedTags.some(tag => tags.includes(tag.toLowerCase()))) return false;
    }

    // Bookmarked only
    const bookmarkId = event._id || event.id || event.title;
    if (bookmarkedOnly && !bookmarkedIds.includes(bookmarkId)) return false;

    // Global search
    if (globalSearch.trim()) {
      const searchLower = globalSearch.toLowerCase();
      const searchableText = [
        event.title, event.description, event.detailedDescription,
        event.organization, event.organizer, event.organizerReputation,
        event.location, event.tags ? event.tags.join(' ') : '',
      ].join(' ').toLowerCase();
      if (!searchableText.includes(searchLower)) return false;
    }

    return true;
  });

  // ── Sorting ───────────────────────────────────────────────────
  filteredEvents = [...filteredEvents].sort((a, b) => {
    const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
    const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;

    switch (sortBy) {
      case 'latest': return dateB - dateA;
      case 'deadline': return deadlineA - deadlineB;
      case 'alpha': return (a.title || '').localeCompare(b.title || '');
      case 'featured': return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      case 'soonest':
      default: return deadlineA - deadlineB;
    }
  });

  // ── Pagination ────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredEvents.length / CARDS_PER_PAGE);
  const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
  const endIndex = startIndex + CARDS_PER_PAGE;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [
    globalSearch, activeCategory, startDate, endDate,
    quickPreset, modeFilters, levelFilters, selectedTags, bookmarkedOnly, sortBy,
  ]);

  // ── Stats (live counts) ───────────────────────────────────────
  const hackathonCount = events.filter(e => (e.type || e.category || '').toLowerCase() === 'hackathon').length;
  const internshipCount = events.filter(e => (e.type || e.category || '').toLowerCase() === 'internship').length;

  const stats = [
    { label: 'Upcoming Events', value: events.length, color: '#3b5bfd' },
    { label: 'Hackathons', value: hackathonCount, color: '#16a34a' },
    { label: 'Internships', value: internshipCount, color: '#f59e1b' },
    { label: 'Students', value: '25K+', color: '#334155' },
  ];

  const categoryCounts = useMemo(() => ({
    all: events.length,
    Hackathon: events.filter(e => (e.type || e.category || '').toLowerCase() === 'hackathon').length,
    Internship: events.filter(e => (e.type || e.category || '').toLowerCase() === 'internship').length,
    Workshop: events.filter(e => (e.type || e.category || '').toLowerCase() === 'workshop').length,
    'Student Competition': events.filter(e => (e.type || e.category || '').toLowerCase() === 'competition').length,
    Seminar: events.filter(e => (e.type || e.category || '').toLowerCase() === 'seminar').length,
  }), [events]);

  const categories = [
    { label: 'All', icon: 'bi-grid-fill', count: categoryCounts.all, key: 'all', color: '#6366f1' },
    { label: 'Hackathons', icon: 'bi-trophy-fill', count: categoryCounts.Hackathon, key: 'Hackathon', color: '#f59e0b' },
    { label: 'Internships', icon: 'bi-briefcase-fill', count: categoryCounts.Internship, key: 'Internship', color: '#10b981' },
    { label: 'Workshops', icon: 'bi-mortarboard-fill', count: categoryCounts.Workshop, key: 'Workshop', color: '#3b82f6' },
    { label: 'Competitions', icon: 'bi-award-fill', count: categoryCounts['Student Competition'], key: 'Student Competition', color: '#ef4444' },
    { label: 'Seminars', icon: 'bi-people-fill', count: categoryCounts.Seminar, key: 'Seminar', color: '#8b5cf6' },
  ];

  // Collapsible sidebar sections state
  const [openSections, setOpenSections] = React.useState({
    search: true, categories: true, deadline: true, mode: true, level: true, tags: false, sort: true,
  });
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Active filter count
  const activeFilterCount = [
    globalSearch.trim() ? 1 : 0,
    activeCategory !== 'all' ? 1 : 0,
    startDate || endDate ? 1 : 0,
    modeFilters.length,
    levelFilters.length,
    selectedTags.length,
    bookmarkedOnly ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleBookmark = async (event) => {
    const { idsKey, dataKey } = getBookmarkStorageKeys();
    const bookmarkId = event._id || event.id || event.title;
    if (!bookmarkId) return;
    const isRemoving = bookmarkedIds.includes(bookmarkId);
    const updated = isRemoving
      ? bookmarkedIds.filter(id => id !== bookmarkId)
      : [...bookmarkedIds, bookmarkId];

    const all = JSON.parse(localStorage.getItem(dataKey) || '[]');
    let updatedData;
    if (isRemoving) {
      updatedData = all.filter(e => (e._id || e.id || e.title) !== bookmarkId);
    } else {
      const normalizedEvent = { ...event, _id: event._id || bookmarkId, id: event.id || event._id || bookmarkId };
      const index = all.findIndex(e => (e._id || e.id || e.title) === bookmarkId);
      updatedData = index >= 0
        ? all.map((e, i) => i === index ? { ...e, ...normalizedEvent } : e)
        : [...all, normalizedEvent];
    }

    setBookmarkedIds(updated);
    localStorage.setItem(idsKey, JSON.stringify(updated));
    localStorage.setItem(dataKey, JSON.stringify(updatedData));
    window.dispatchEvent(new Event('bookmarks-changed'));

    const token = localStorage.getItem('clockdin_token');
    const serverEventId = event._id;
    if (token && isValidObjectId(serverEventId)) {
      try {
        const isBookmarkedNow = updated.includes(bookmarkId);
        if (isBookmarkedNow) {
          await apiFetch('/api/users/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ eventId: serverEventId })
          });
        } else {
          await apiFetch(`/api/users/bookmarks/${serverEventId}`, {
            method: 'DELETE', headers: { 'x-auth-token': token }
          });
        }
      } catch (err) { console.error('Failed to sync bookmark', err); }
    }
  };

  const handleEventClick = (event) => { setSelectedEvent(event); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedEvent(null); };

  return (
    <div className="container-fluid mt-4">
      <div className="events-layout">
        {/* ── Premium Sidebar ── */}
        <aside className={`premium-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-scroll">

            {/* ── Header ── */}
            <div className="sb-header">
              <div className="sb-header-left">
                <div className="sb-eyebrow">Filters</div>
                <h5 className="sb-title">Refine Events</h5>
              </div>
              <div className="sb-header-right">
                {activeFilterCount > 0 && (
                  <span className="sb-badge">{activeFilterCount}</span>
                )}
                <button className="sb-close-btn d-lg-none" onClick={() => setIsSidebarOpen(false)} aria-label="Close filters">
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>

            {/* ── Active Filter Summary Strip ── */}
            {activeFilterCount > 0 && (
              <div className="sb-active-strip">
                <i className="bi bi-funnel-fill me-2" style={{color:'#6366f1'}}></i>
                <span>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
                <button className="sb-strip-clear" onClick={clearAllFilters}>Clear all</button>
              </div>
            )}

            {/* ── Search ── */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('search')}>
                <span><i className="bi bi-search me-2" style={{color:'#6366f1'}}></i>Search</span>
                <i className={`bi bi-chevron-${openSections.search ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.search && (
                <div className="sb-section-body">
                  <div className={`sb-search-wrap${globalSearch ? ' has-value' : ''}`}>
                    <i className="bi bi-search sb-search-icon"></i>
                    <input
                      type="text"
                      className="sb-search-input"
                      placeholder="Events, orgs, skills…"
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                    />
                    {globalSearch && (
                      <button className="sb-search-clear" onClick={() => setGlobalSearch('')} aria-label="Clear search">
                        <i className="bi bi-x-circle-fill"></i>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Categories ── */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('categories')}>
                <span><i className="bi bi-grid-fill me-2" style={{color:'#6366f1'}}></i>Categories</span>
                <i className={`bi bi-chevron-${openSections.categories ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.categories && (
                <div className="sb-section-body">
                  <div className="sb-cat-grid">
                    {categories.map(cat => (
                      <button
                        key={cat.key}
                        className={`sb-cat-btn${activeCategory === cat.key ? ' active' : ''}`}
                        onClick={() => setActiveCategory(cat.key)}
                      >
                        {/* Icon pill: colored bg always, white icon when active */}
                        <span className="sb-cat-icon" style={{
                          background: activeCategory === cat.key ? cat.color : `${cat.color}18`,
                          color: activeCategory === cat.key ? '#fff' : cat.color,
                          border: 'none'
                        }}>
                          <i className={`bi ${cat.icon}`}></i>
                        </span>
                        <span className="sb-cat-label">{cat.label}</span>
                        {/* Count: white pill with cat color text when active so it's always visible */}
                        <span className="sb-cat-count" style={activeCategory === cat.key
                          ? {background:'rgba(255,255,255,0.92)', color: cat.color, fontWeight:'800'}
                          : {}}>{cat.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Deadline Range ── */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('deadline')}>
                <span><i className="bi bi-calendar-range me-2" style={{color:'#6366f1'}}></i>Deadline Range</span>
                {(startDate || endDate) && <span className="sb-section-dot"></span>}
                <i className={`bi bi-chevron-${openSections.deadline ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.deadline && (
                <div className="sb-section-body">
                  <div className="sb-date-row">
                    <div className="sb-date-field">
                      <label className="sb-date-label">From</label>
                      <input type="date" className="sb-date-input" value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setQuickPreset(''); }} />
                    </div>
                    <div className="sb-date-sep"><i className="bi bi-arrow-right"></i></div>
                    <div className="sb-date-field">
                      <label className="sb-date-label">To</label>
                      <input type="date" className="sb-date-input" value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setQuickPreset(''); }} />
                    </div>
                  </div>
                  <div className="sb-preset-grid">
                    {[
                      { label: '7 Days', key: '7d', icon: 'bi-lightning-fill' },
                      { label: '30 Days', key: '30d', icon: 'bi-calendar3' },
                      { label: 'Weekend', key: 'weekend', icon: 'bi-sun' },
                      { label: 'Anytime', key: '', icon: 'bi-infinity' },
                    ].map(p => (
                      <button
                        key={p.key}
                        className={`sb-preset${quickPreset === p.key ? ' active' : ''}`}
                        onClick={() => handlePresetSelect(p.key)}
                      >
                        <i className={`bi ${p.icon} me-1`}></i>{p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Mode ── */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('mode')}>
                <span><i className="bi bi-wifi me-2" style={{color:'#6366f1'}}></i>Mode</span>
                {modeFilters.length > 0 && <span className="sb-section-dot"></span>}
                <i className={`bi bi-chevron-${openSections.mode ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.mode && (
                <div className="sb-section-body">
                  <div className="sb-mode-grid">
                    {[
                      { key: 'online',  label: 'Online',  icon: 'bi-globe2',          color: '#10b981', activeColor: '#065f46' },
                      { key: 'offline', label: 'Offline', icon: 'bi-geo-alt-fill',    color: '#f59e0b', activeColor: '#78350f' },
                      { key: 'hybrid',  label: 'Hybrid',  icon: 'bi-arrow-left-right', color: '#6366f1', activeColor: '#3730a3' },
                    ].map(m => {
                      const isActive = modeFilters.includes(m.key);
                      return (
                        <button
                          key={m.key}
                          className={`sb-mode-btn${isActive ? ' active' : ''}`}
                          onClick={() => setModeFilters(prev => toggleValue(prev, m.key))}
                          style={isActive ? {
                            background: `${m.color}14`,
                            borderColor: `${m.color}55`,
                            color: m.activeColor
                          } : {}}
                        >
                          {/* Icon always keeps its natural color — never white */}
                          <i className={`bi ${m.icon}`} style={{color: m.color, opacity: 1}}></i>
                          <span>{m.label}</span>
                          {isActive && <i className="bi bi-check2-circle sb-check" style={{color: m.color}}></i>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Skill Level ── */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('level')}>
                <span><i className="bi bi-bar-chart-fill me-2" style={{color:'#6366f1'}}></i>Skill Level</span>
                {levelFilters.length > 0 && <span className="sb-section-dot"></span>}
                <i className={`bi bi-chevron-${openSections.level ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.level && (
                <div className="sb-section-body">
                  <div className="sb-level-stack">
                    {[
                      {
                        key: 'beginner', label: 'Beginner', icon: 'bi-patch-check-fill',
                        iconColor: '#10b981',
                        activeStyle: { background:'rgba(16,185,129,0.09)', borderColor:'rgba(16,185,129,0.38)', color:'#065f46' }
                      },
                      {
                        key: 'intermediate', label: 'Intermediate', icon: 'bi-lightning-charge-fill',
                        iconColor: '#f59e0b',
                        activeStyle: { background:'rgba(245,158,11,0.09)', borderColor:'rgba(245,158,11,0.38)', color:'#78350f' }
                      },
                      {
                        key: 'advanced', label: 'Advanced', icon: 'bi-rocket-takeoff-fill',
                        iconColor: '#ef4444',
                        activeStyle: { background:'rgba(239,68,68,0.09)', borderColor:'rgba(239,68,68,0.38)', color:'#7f1d1d' }
                      },
                    ].map(lvl => {
                      const isActive = levelFilters.includes(lvl.key);
                      return (
                        <button
                          key={lvl.key}
                          className={`sb-level-btn${isActive ? ' active' : ''}`}
                          onClick={() => setLevelFilters(prev => toggleValue(prev, lvl.key))}
                          style={isActive ? lvl.activeStyle : {}}
                        >
                          {/* Icon always shows its own color — not colored bg when unselected */}
                          <i className={`bi ${lvl.icon}`} style={{color: isActive ? lvl.activeStyle.color : lvl.iconColor}}></i>
                          <span>{lvl.label}</span>
                          {isActive && <i className="bi bi-check-circle-fill ms-auto" style={{color: lvl.activeStyle.color}}></i>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Popular Tags ── */}
            {popularTags.length > 0 && (
              <div className="sb-section">
                <button className="sb-section-header" onClick={() => toggleSection('tags')}>
                  <span><i className="bi bi-hash me-2" style={{color:'#6366f1'}}></i>Popular Tags</span>
                  {selectedTags.length > 0 && <span className="sb-section-dot"></span>}
                  <i className={`bi bi-chevron-${openSections.tags ? 'up' : 'down'} sb-chevron`}></i>
                </button>
                {openSections.tags && (
                  <div className="sb-section-body">
                    <div className="sb-tags-cloud">
                      {popularTags.map(tag => (
                        <button
                          key={tag}
                          className={`sb-tag${selectedTags.includes(tag) ? ' active' : ''}`}
                          onClick={() => setSelectedTags(prev => toggleValue(prev, tag))}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Sort By ── */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('sort')}>
                <span><i className="bi bi-sort-down me-2" style={{color:'#6366f1'}}></i>Sort By</span>
                <i className={`bi bi-chevron-${openSections.sort ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.sort && (
                <div className="sb-section-body">
                  <div className="sb-sort-stack">
                    {[
                      { value: 'soonest', label: 'Deadline (Soonest)', icon: 'bi-alarm-fill' },
                      { value: 'latest', label: 'Event Date (Latest)', icon: 'bi-calendar-event-fill' },
                      { value: 'alpha', label: 'A – Z', icon: 'bi-sort-alpha-down' },
                      { value: 'featured', label: 'Featured First', icon: 'bi-star-fill' },
                    ].map(s => (
                      <button
                        key={s.value}
                        className={`sb-sort-btn${sortBy === s.value ? ' active' : ''}`}
                        onClick={() => setSortBy(s.value)}
                      >
                        <i className={`bi ${s.icon}`}></i>
                        <span>{s.label}</span>
                        {sortBy === s.value && <i className="bi bi-check2-circle ms-auto" style={{color:'#6366f1'}}></i>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Bookmarked Only Toggle ── */}
            <div className="sb-bookmark-row">
              <div className="sb-bookmark-label">
                <i className="bi bi-bookmark-heart-fill" style={{color:'#ef4444'}}></i>
                <span>Bookmarked only</span>
              </div>
              <label className="sb-toggle">
                <input type="checkbox" checked={bookmarkedOnly} onChange={(e) => setBookmarkedOnly(e.target.checked)} />
                <span className="sb-toggle-thumb"></span>
              </label>
            </div>

            {/* ── Actions ── */}
            <div className="sb-actions">
              <button
                className="sb-apply-btn"
                onClick={() => setIsSidebarOpen(false)}
              >
                <i className="bi bi-check2-all me-2"></i>
                Apply Filters
                {activeFilterCount > 0 && <span className="sb-apply-badge">{activeFilterCount}</span>}
              </button>
              {activeFilterCount > 0 && (
                <button className="sb-clear-btn" onClick={clearAllFilters}>
                  <i className="bi bi-x-circle me-2"></i>Clear All Filters
                </button>
              )}
            </div>

          </div>
        </aside>

        {isSidebarOpen && <div className="sidebar-backdrop d-lg-none" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* ── Main Content ── */}
        <div className="events-main flex-grow-1">
          <div className="d-lg-none mb-3">
            <button className="btn btn-outline-primary" onClick={() => setIsSidebarOpen(true)}>
              <i className="bi bi-sliders me-2"></i>Filters
            </button>
          </div>

          {/* Hero Section */}
          <div className="events-hero">
            <h1 style={{ fontWeight: 800, fontSize: '2.7rem', color: '#22223b', marginBottom: '0.45rem' }}>
              Discover Amazing <span style={{ color: '#3b5bfd' }}>Student Events</span>
            </h1>
            <p style={{ fontSize: '1.13rem', color: '#475569', marginBottom: '2.25rem' }}>
              Find hackathons, internships, workshops, and competitions tailored for students. All events are upcoming — never miss a real opportunity.
            </p>

            {/* Live Stats */}
            <div className="events-stats-row">
              {stats.map((stat) => (
                <div className="events-stat-card" key={stat.label}>
                  <div className="events-stat-value" style={{ color: stat.color }}>
                    {eventsLoading ? '—' : stat.value}
                  </div>
                  <div className="events-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {eventsLoading && (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p style={{ color: '#64748b' }}>Loading upcoming events...</p>
            </div>
          )}

          {/* Error state */}
          {!eventsLoading && eventsError && (
            <div className="alert alert-warning" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>{eventsError}
            </div>
          )}

          {/* Search result banner */}
          {!eventsLoading && globalSearch && (
            <div style={{
              background: 'linear-gradient(135deg, #f0f4ff 0%, #fff5f7 100%)',
              borderRadius: '1rem', padding: '1rem', marginBottom: '2rem', border: '1px solid #e0e7ff'
            }}>
              <h6 style={{ color: '#22223b', fontWeight: 700, marginBottom: '0.25rem' }}>
                <i className="bi bi-lightning-fill me-2" style={{ color: '#3b5bfd' }}></i>
                {filteredEvents.length} Event{filteredEvents.length !== 1 ? 's' : ''} Found
              </h6>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 0 }}>
                Matching "{globalSearch}"
              </p>
            </div>
          )}

          {/* Events Grid */}
          {!eventsLoading && !eventsError && (
            filteredEvents.length === 0 ? (
              <div className="d-flex flex-column align-items-center justify-content-center" style={{
                background: '#fff', borderRadius: '1.2rem', minHeight: '400px',
                border: '1.5px solid #e5e7eb', padding: '2rem'
              }}>
                <i className="bi bi-calendar-x" style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                <h4 style={{ color: '#22223b', fontWeight: 700 }}>No Upcoming Events Found</h4>
                <p style={{ color: '#64748b', textAlign: 'center', maxWidth: '400px' }}>
                  Try adjusting your search or filters.
                </p>
                <button className="btn btn-outline-primary mt-2" onClick={clearAllFilters}>Clear Filters</button>
              </div>
            ) : (
              <>
                {/* Results info */}
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Showing <strong>{filteredEvents.length}</strong> upcoming event{filteredEvents.length !== 1 ? 's' : ''}
                  {activeCategory !== 'all' ? ` in ${activeCategory}` : ''}
                </div>

                <div className="row g-4" style={{ marginBottom: '3rem' }}>
                  {paginatedEvents.map((event) => (
                    <div className="col-md-6 col-lg-4" key={event._id}>
                      <EventCard
                        event={event}
                        onBookmark={handleBookmark}
                        isBookmarked={bookmarkedIds.includes(event._id)}
                        showBookmark={true}
                        onClick={() => handleEventClick(event)}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
                    <button
                      className="btn btn-outline-secondary"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      style={{ fontWeight: 600, borderRadius: '0.6rem' }}
                    >
                      <i className="bi bi-chevron-left me-1"></i>Previous
                    </button>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i + 1}
                          className={currentPage === i + 1 ? 'btn btn-primary' : 'btn btn-outline-secondary'}
                          onClick={() => setCurrentPage(i + 1)}
                          style={{ fontWeight: 600, borderRadius: '0.6rem', minWidth: '40px' }}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      className="btn btn-outline-secondary"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      style={{ fontWeight: 600, borderRadius: '0.6rem' }}
                    >
                      Next<i className="bi bi-chevron-right ms-1"></i>
                    </button>
                  </div>
                )}

                <div style={{ textAlign: 'center', color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>
                  Showing {startIndex + 1}–{Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
                </div>
              </>
            )
          )}
        </div>
      </div>

      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Events;
