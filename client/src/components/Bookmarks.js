import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard from './EventCard';
import EventModal from './EventModal';
import '../Events.css';
import { getBookmarkStorageKeys } from '../utils/bookmarkStorage';
import { apiFetch } from '../utils/api';

const normalize = (val) => (val || '').toString().trim();
const normalizeLower = (val) => normalize(val).toLowerCase();
const prettyLabel = (val) => normalize(val)
  .split(/[_\-\s]+/)
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const normalizeCategorySelection = (val) => {
  const base = normalize(val).toLowerCase();
  return base.endsWith('s') ? base.slice(0, -1) : base;
};

const getCategory = (ev) => normalize(ev.eventType || ev.category || ev.type);
const getMode     = (ev) => normalize(ev.mode);

const Bookmarks = () => {
  const navigate = useNavigate();

  // ── Bookmark data ─────────────────────────────────────────────
  const [bookmarks, setBookmarks] = useState(() => {
    const { dataKey } = getBookmarkStorageKeys();
    const data = localStorage.getItem(dataKey);
    return data ? JSON.parse(data) : [];
  });

  // ── On mount: sync bookmarks from server (production-safe) ───
  useEffect(() => {
    const token = localStorage.getItem('clockdin_token');
    if (!token) return;

    apiFetch('/api/users/me', { headers: { 'x-auth-token': token } })
      .then(r => r.json())
      .then(async (user) => {
        if (!user || !Array.isArray(user.bookmarks) || user.bookmarks.length === 0) return;

        // Fetch all events and filter to bookmarked ones
        const evRes = await apiFetch('/api/events?limit=500');
        const evJson = await evRes.json();
        const allEvents = evJson?.data?.events || (Array.isArray(evJson) ? evJson : []);

        const bookmarkedSet = new Set(user.bookmarks.map(String));
        const bookmarkedEvents = allEvents.filter(e => bookmarkedSet.has(String(e._id || e.id)));

        if (bookmarkedEvents.length > 0) {
          const { idsKey, dataKey } = getBookmarkStorageKeys();
          localStorage.setItem(idsKey, JSON.stringify(bookmarkedEvents.map(e => e._id || e.id)));
          localStorage.setItem(dataKey, JSON.stringify(bookmarkedEvents));
          setBookmarks(bookmarkedEvents);
        }
      })
      .catch(() => {}); // Silently fail — use localStorage cache
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sidebar / filter state (mirrors Events.js premium sidebar) ─
  const [globalSearch, setGlobalSearch]       = useState('');
  const [activeCategory, setActiveCategory]   = useState('all');
  const [startDate, setStartDate]             = useState('');
  const [endDate, setEndDate]                 = useState('');
  const [quickPreset, setQuickPreset]         = useState('');
  const [modeFilters, setModeFilters]         = useState([]);
  const [levelFilters, setLevelFilters]       = useState([]);
  const [selectedTags, setSelectedTags]       = useState([]);
  const [sortBy, setSortBy]                   = useState('deadline-asc');
  const [deadlineFilter, setDeadlineFilter]   = useState('all');
  const [isSidebarOpen, setIsSidebarOpen]     = useState(false);
  const [openSections, setOpenSections]       = useState({
    search: true, categories: true, deadline: true,
    mode: true, level: true, tags: false, sort: true,
  });
  const toggleSection = (key) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Other UI state ────────────────────────────────────────────
  const [currentPage, setCurrentPage]         = useState(1);
  const [selectedEvent, setSelectedEvent]     = useState(null);
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const contentRefs                           = useRef({});
  const CARDS_PER_PAGE = 12;

  // ── Refresh bookmarks on localStorage change ──────────────────
  useEffect(() => {
    const refresh = () => {
      const { dataKey } = getBookmarkStorageKeys();
      const data = localStorage.getItem(dataKey);
      setBookmarks(data ? JSON.parse(data) : []);
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


  // ── Helper: days until deadline ───────────────────────────────
  function daysUntilDeadline(dateValue) {
    if (!dateValue) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const deadlineDate = new Date(dateValue); deadlineDate.setHours(0,0,0,0);
    return Math.ceil((deadlineDate - today) / 86400000);
  }
  const getStatusDate = (ev) => ev.deadline || ev.eventDate || ev.date;

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let upcoming = 0, close = 0, completed = 0;
    bookmarks.forEach(ev => {
      if (ev.isArchived) return;
      const days = daysUntilDeadline(getStatusDate(ev));
      if (days === null) return;
      if (days < 0) { completed++; return; }
      upcoming++;
      if (days <= 7) close++;
    });
    return { total: bookmarks.length, upcoming, close, completed };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarks]);

  // ── Category counts ───────────────────────────────────────────
  const CATEGORY_DEFS = [
    { label: 'All',          icon: 'bi-grid-fill',        key: 'all',                  color: '#6366f1' },
    { label: 'Hackathons',   icon: 'bi-trophy-fill',      key: 'Hackathon',            color: '#f59e0b' },
    { label: 'Internships',  icon: 'bi-briefcase-fill',   key: 'Internship',           color: '#10b981' },
    { label: 'Workshops',    icon: 'bi-mortarboard-fill', key: 'Workshop',             color: '#3b82f6' },
    { label: 'Competitions', icon: 'bi-award-fill',       key: 'Student Competition',  color: '#ef4444' },
    { label: 'Seminars',     icon: 'bi-people-fill',      key: 'Seminar',              color: '#8b5cf6' },
  ];

  const categoryCounts = useMemo(() => {
    const counts = { all: bookmarks.length };
    CATEGORY_DEFS.slice(1).forEach(cat => {
      counts[cat.key] = bookmarks.filter(ev =>
        normalizeCategorySelection(prettyLabel(getCategory(ev))) === normalizeCategorySelection(cat.label)
      ).length;
    });
    return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarks]);

  const categoriesWithCounts = CATEGORY_DEFS.map(cat => ({
    ...cat,
    count: categoryCounts[cat.key] ?? 0,
  }));

  // ── Popular tags from bookmarks ───────────────────────────────
  const popularTags = useMemo(() => {
    const tagSet = new Set();
    bookmarks.forEach(ev => (ev.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).slice(0, 14);
  }, [bookmarks]);

  // ── Toggle helper ─────────────────────────────────────────────
  const toggleValue = (list, value) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  // ── Date presets ──────────────────────────────────────────────
  const formatInputDate = (d) => d.toISOString().split('T')[0];
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
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
      setStartDate(''); setEndDate('');
    }
  };

  const clearAllFilters = () => {
    setGlobalSearch('');
    setActiveCategory('all');
    setStartDate(''); setEndDate(''); setQuickPreset('');
    setModeFilters([]); setLevelFilters([]); setSelectedTags([]);
    setSortBy('deadline-asc');
    setDeadlineFilter('all');
  };

  const activeFilterCount = [
    globalSearch.trim() ? 1 : 0,
    activeCategory !== 'all' ? 1 : 0,
    startDate || endDate ? 1 : 0,
    modeFilters.length,
    levelFilters.length,
    selectedTags.length,
  ].reduce((a, b) => a + b, 0);

  // ── Filtering ─────────────────────────────────────────────────
  let filteredBookmarks = bookmarks.filter(ev => {
    if (deadlineFilter === 'archived') return ev.isArchived;
    if (ev.isArchived) return false;

    // Search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      const text = [ev.title, ev.description, ev.location, (ev.tags || []).join(' ')].join(' ').toLowerCase();
      if (!text.includes(q)) return false;
    }

    // Category
    if (activeCategory !== 'all') {
      const catDef = CATEGORY_DEFS.find(c => c.key === activeCategory);
      if (catDef) {
        if (normalizeCategorySelection(prettyLabel(getCategory(ev))) !== normalizeCategorySelection(catDef.label))
          return false;
      }
    }

    // Deadline date range
    const deadlineDate = ev.deadline ? new Date(ev.deadline) : null;
    if (startDate && deadlineDate && deadlineDate < new Date(startDate)) return false;
    if (endDate   && deadlineDate && deadlineDate > new Date(endDate))   return false;

    // Mode
    if (modeFilters.length) {
      const modeLower = (getMode(ev) || '').toLowerCase();
      if (!modeFilters.some(m => modeLower.includes(m))) return false;
    }

    // Skill level
    if (levelFilters.length) {
      const difficulty = normalizeLower(ev.difficulty || ev.level || ev.skillLevel);
      if (!levelFilters.includes(difficulty)) return false;
    }

    // Tags
    if (selectedTags.length) {
      const evTags = (ev.tags || []).map(t => t.toLowerCase());
      if (!selectedTags.some(t => evTags.includes(t.toLowerCase()))) return false;
    }

    // Deadline status tab
    if (deadlineFilter === 'upcoming-only') {
      const days = daysUntilDeadline(getStatusDate(ev));
      if (days === null || days < 0) return false;
    } else if (deadlineFilter === 'completed-only') {
      const days = daysUntilDeadline(getStatusDate(ev));
      if (days === null || days >= 0) return false;
    }

    return true;
  });

  // ── Sorting ───────────────────────────────────────────────────
  filteredBookmarks = [...filteredBookmarks].sort((a, b) => {
    const dA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const dB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    const eA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
    const eB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
    switch (sortBy) {
      case 'latest':       return eB - eA;
      case 'alpha':        return (a.title || '').localeCompare(b.title || '');
      case 'deadline-asc': return dA - dB;
      default:             return dA - dB;
    }
  });

  // ── Pagination ────────────────────────────────────────────────
  const totalPages   = Math.ceil(filteredBookmarks.length / CARDS_PER_PAGE);
  const startIndex   = (currentPage - 1) * CARDS_PER_PAGE;
  const paginatedBookmarks = filteredBookmarks.slice(startIndex, startIndex + CARDS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [
    globalSearch, activeCategory, startDate, endDate,
    modeFilters, levelFilters, selectedTags, sortBy, deadlineFilter,
  ]);

  // ── Unbookmark ────────────────────────────────────────────────
  const handleUnbookmarkFromObj = async (eventObj) => {
    const id = eventObj._id || eventObj.id || eventObj.title;
    const updated = bookmarks.filter(ev => (ev._id || ev.id || ev.title) !== id);
    setBookmarks(updated);
    const { dataKey, idsKey } = getBookmarkStorageKeys();
    localStorage.setItem(dataKey, JSON.stringify(updated));
    const ids = JSON.parse(localStorage.getItem(idsKey) || '[]').filter(i => i !== id);
    localStorage.setItem(idsKey, JSON.stringify(ids));
    window.dispatchEvent(new Event('bookmarks-changed'));

    // Sync to backend
    const token = localStorage.getItem('clockdin_token');
    const realId = eventObj._id || eventObj.id;
    if (token && realId) {
      try {
        await apiFetch(`/api/users/bookmarks/${realId}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      } catch (err) {
        console.error('Failed to unbookmark on server', err);
      }
    }
  };

  const handleClearAll = async () => {
    if (!bookmarks.length) return;
    if (!window.confirm('Clear all bookmarks? This cannot be undone.')) return;
    setBookmarks([]);
    const { dataKey, idsKey } = getBookmarkStorageKeys();
    localStorage.removeItem(dataKey);
    localStorage.removeItem(idsKey);
    window.dispatchEvent(new Event('bookmarks-changed'));

    // Sync to backend
    const token = localStorage.getItem('clockdin_token');
    if (token) {
      try {
        await apiFetch('/api/users/bookmarks', { method: 'DELETE', headers: { 'x-auth-token': token } });
      } catch (err) {
        console.error('Failed to clear bookmarks on server', err);
      }
    }
  };

  const handleUnarchive = (eventObj) => {
    const updated = bookmarks.map(ev => {
      if ((ev._id || ev.id || ev.title) === (eventObj._id || eventObj.id || eventObj.title)) {
        const clone = { ...ev }; delete clone.isArchived; return clone;
      }
      return ev;
    });
    setBookmarks(updated);
    const { dataKey } = getBookmarkStorageKeys();
    localStorage.setItem(dataKey, JSON.stringify(updated));
  };

  const handleEventClick = (event) => { setSelectedEvent(event); setIsModalOpen(true); };
  const handleCloseModal  = () => { setIsModalOpen(false); setSelectedEvent(null); };

  // ── Deadline helpers ──────────────────────────────────────────
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return 'N/A'; }
  };

  const getDeadlineStyles = (dateValue) => {
    const days = daysUntilDeadline(dateValue);
    if (days === null) return { bg: '#f3f4f6', border: '#e5e7eb', text: '#6b7280', icon: '#9ca3af' };
    if (days < 0)      return { bg: '#f3f4f6', border: '#e5e7eb', text: '#6b7280', icon: '#9ca3af' };
    if (days === 0)    return { bg: '#fed7aa', border: '#fdba74', text: '#d97706', icon: '#f59e0b' };
    if (days <= 3)     return { bg: '#fecaca', border: '#fca5a5', text: '#dc2626', icon: '#ef4444' };
    if (days <= 7)     return { bg: '#fef3c7', border: '#fde68a', text: '#d97706', icon: '#f59e0b' };
    return { bg: '#dbeafe', border: '#bfdbfe', text: '#0284c7', icon: '#0ea5e9' };
  };

  const getDeadlineBadgeText = (dateValue) => {
    const days = daysUntilDeadline(dateValue);
    if (days === null) return 'No Deadline';
    if (days < 0)  return 'Expired';
    if (days === 0) return 'Today!';
    if (days <= 3)  return 'Urgent';
    if (days <= 7)  return 'Soon';
    return 'Upcoming';
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid mt-4" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <div className="events-layout">

        {/* ── PREMIUM SIDEBAR (same as Events page) ── */}
        <aside className={`premium-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-scroll">

            {/* Header */}
            <div className="sb-header">
              <div className="sb-header-left">
                <div className="sb-eyebrow">Filters</div>
                <h5 className="sb-title">Refine Bookmarks</h5>
              </div>
              <div className="sb-header-right">
                {activeFilterCount > 0 && <span className="sb-badge">{activeFilterCount}</span>}
                <button className="sb-close-btn d-lg-none" onClick={() => setIsSidebarOpen(false)} aria-label="Close filters">
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>

            {/* Active filter strip */}
            {activeFilterCount > 0 && (
              <div className="sb-active-strip">
                <i className="bi bi-funnel-fill me-2" style={{ color: '#6366f1' }}></i>
                <span>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
                <button className="sb-strip-clear" onClick={clearAllFilters}>Clear all</button>
              </div>
            )}

            {/* Search */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('search')}>
                <span><i className="bi bi-search me-2" style={{ color: '#6366f1' }}></i>Search</span>
                <i className={`bi bi-chevron-${openSections.search ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.search && (
                <div className="sb-section-body">
                  <div className={`sb-search-wrap${globalSearch ? ' has-value' : ''}`}>
                    <i className="bi bi-search sb-search-icon"></i>
                    <input
                      type="text"
                      className="sb-search-input"
                      placeholder="Title, tags, location…"
                      value={globalSearch}
                      onChange={e => setGlobalSearch(e.target.value)}
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

            {/* Categories */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('categories')}>
                <span><i className="bi bi-grid-fill me-2" style={{ color: '#6366f1' }}></i>Categories</span>
                <i className={`bi bi-chevron-${openSections.categories ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.categories && (
                <div className="sb-section-body">
                  <div className="sb-cat-grid">
                    {categoriesWithCounts.map(cat => (
                      <button
                        key={cat.key}
                        className={`sb-cat-btn${activeCategory === cat.key ? ' active' : ''}`}
                        onClick={() => setActiveCategory(cat.key)}
                      >
                        <span className="sb-cat-icon" style={{
                          background: activeCategory === cat.key ? cat.color : `${cat.color}18`,
                          color: activeCategory === cat.key ? '#fff' : cat.color,
                          border: 'none'
                        }}>
                          <i className={`bi ${cat.icon}`}></i>
                        </span>
                        <span className="sb-cat-label">{cat.label}</span>
                        <span className="sb-cat-count" style={activeCategory === cat.key
                          ? { background: 'rgba(255,255,255,0.92)', color: cat.color, fontWeight: '800' }
                          : {}}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Deadline Range */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('deadline')}>
                <span><i className="bi bi-calendar-range me-2" style={{ color: '#6366f1' }}></i>Deadline Range</span>
                {(startDate || endDate) && <span className="sb-section-dot"></span>}
                <i className={`bi bi-chevron-${openSections.deadline ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.deadline && (
                <div className="sb-section-body">
                  <div className="sb-date-row">
                    <div className="sb-date-field">
                      <label className="sb-date-label">From</label>
                      <input type="date" className="sb-date-input" value={startDate}
                        onChange={e => { setStartDate(e.target.value); setQuickPreset(''); }} />
                    </div>
                    <div className="sb-date-sep"><i className="bi bi-arrow-right"></i></div>
                    <div className="sb-date-field">
                      <label className="sb-date-label">To</label>
                      <input type="date" className="sb-date-input" value={endDate}
                        onChange={e => { setEndDate(e.target.value); setQuickPreset(''); }} />
                    </div>
                  </div>
                  <div className="sb-preset-grid">
                    {[
                      { label: '7 Days',  key: '7d',      icon: 'bi-lightning-fill' },
                      { label: '30 Days', key: '30d',     icon: 'bi-calendar3' },
                      { label: 'Weekend', key: 'weekend', icon: 'bi-sun' },
                      { label: 'Anytime', key: '',        icon: 'bi-infinity' },
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

            {/* Mode */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('mode')}>
                <span><i className="bi bi-wifi me-2" style={{ color: '#6366f1' }}></i>Mode</span>
                {modeFilters.length > 0 && <span className="sb-section-dot"></span>}
                <i className={`bi bi-chevron-${openSections.mode ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.mode && (
                <div className="sb-section-body">
                  <div className="sb-mode-grid">
                    {[
                      { key: 'online',  label: 'Online',  icon: 'bi-globe2',           color: '#10b981', activeColor: '#065f46' },
                      { key: 'offline', label: 'Offline', icon: 'bi-geo-alt-fill',     color: '#f59e0b', activeColor: '#78350f' },
                      { key: 'hybrid',  label: 'Hybrid',  icon: 'bi-arrow-left-right', color: '#6366f1', activeColor: '#3730a3' },
                    ].map(m => {
                      const isActive = modeFilters.includes(m.key);
                      return (
                        <button
                          key={m.key}
                          className={`sb-mode-btn${isActive ? ' active' : ''}`}
                          onClick={() => setModeFilters(prev => toggleValue(prev, m.key))}
                          style={isActive ? { background: `${m.color}14`, borderColor: `${m.color}55`, color: m.activeColor } : {}}
                        >
                          <i className={`bi ${m.icon}`} style={{ color: m.color, opacity: 1 }}></i>
                          <span>{m.label}</span>
                          {isActive && <i className="bi bi-check2-circle sb-check" style={{ color: m.color }}></i>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Skill Level */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('level')}>
                <span><i className="bi bi-bar-chart-fill me-2" style={{ color: '#6366f1' }}></i>Skill Level</span>
                {levelFilters.length > 0 && <span className="sb-section-dot"></span>}
                <i className={`bi bi-chevron-${openSections.level ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.level && (
                <div className="sb-section-body">
                  <div className="sb-level-stack">
                    {[
                      { key: 'beginner',     label: 'Beginner',     icon: 'bi-patch-check-fill',      iconColor: '#10b981', activeStyle: { background: 'rgba(16,185,129,0.09)', borderColor: 'rgba(16,185,129,0.38)', color: '#065f46' } },
                      { key: 'intermediate', label: 'Intermediate', icon: 'bi-lightning-charge-fill', iconColor: '#f59e0b', activeStyle: { background: 'rgba(245,158,11,0.09)', borderColor: 'rgba(245,158,11,0.38)', color: '#78350f' } },
                      { key: 'advanced',     label: 'Advanced',     icon: 'bi-rocket-takeoff-fill',   iconColor: '#ef4444', activeStyle: { background: 'rgba(239,68,68,0.09)',  borderColor: 'rgba(239,68,68,0.38)',  color: '#7f1d1d' } },
                    ].map(lvl => {
                      const isActive = levelFilters.includes(lvl.key);
                      return (
                        <button
                          key={lvl.key}
                          className={`sb-level-btn${isActive ? ' active' : ''}`}
                          onClick={() => setLevelFilters(prev => toggleValue(prev, lvl.key))}
                          style={isActive ? lvl.activeStyle : {}}
                        >
                          <i className={`bi ${lvl.icon}`} style={{ color: isActive ? lvl.activeStyle.color : lvl.iconColor }}></i>
                          <span>{lvl.label}</span>
                          {isActive && <i className="bi bi-check-circle-fill ms-auto" style={{ color: lvl.activeStyle.color }}></i>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Popular Tags */}
            {popularTags.length > 0 && (
              <div className="sb-section">
                <button className="sb-section-header" onClick={() => toggleSection('tags')}>
                  <span><i className="bi bi-hash me-2" style={{ color: '#6366f1' }}></i>Popular Tags</span>
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

            {/* Sort By */}
            <div className="sb-section">
              <button className="sb-section-header" onClick={() => toggleSection('sort')}>
                <span><i className="bi bi-sort-down me-2" style={{ color: '#6366f1' }}></i>Sort By</span>
                <i className={`bi bi-chevron-${openSections.sort ? 'up' : 'down'} sb-chevron`}></i>
              </button>
              {openSections.sort && (
                <div className="sb-section-body">
                  <div className="sb-sort-stack">
                    {[
                      { value: 'deadline-asc', label: 'Deadline (Soonest)',   icon: 'bi-alarm-fill' },
                      { value: 'latest',       label: 'Event Date (Latest)',  icon: 'bi-calendar-event-fill' },
                      { value: 'alpha',        label: 'A – Z',                icon: 'bi-sort-alpha-down' },
                    ].map(s => (
                      <button
                        key={s.value}
                        className={`sb-sort-btn${sortBy === s.value ? ' active' : ''}`}
                        onClick={() => setSortBy(s.value)}
                      >
                        <i className={`bi ${s.icon}`}></i>
                        <span>{s.label}</span>
                        {sortBy === s.value && <i className="bi bi-check2-circle ms-auto" style={{ color: '#6366f1' }}></i>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="sb-actions">
              <button className="sb-apply-btn" onClick={() => setIsSidebarOpen(false)}>
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

        {/* ── MAIN CONTENT ── */}
        <div className="events-main flex-grow-1">

          {/* Mobile filter trigger */}
          <div className="d-lg-none mb-3">
            <button className="btn btn-outline-primary" onClick={() => setIsSidebarOpen(true)}>
              <i className="bi bi-sliders me-2"></i>Filters
              {activeFilterCount > 0 && <span className="badge bg-primary ms-2">{activeFilterCount}</span>}
            </button>
          </div>

          {/* Header */}
          <div className="bookmarks-header">
            <div className="d-flex gap-3">
              <div className="bookmarks-header-icon"><i className="bi bi-bookmark-fill"></i></div>
              <div>
                <div className="bookmarks-header-title">Bookmarked Events</div>
                <div className="bookmarks-header-sub">All your saved events in one place</div>
              </div>
            </div>
            <button className="bookmarks-clear-btn" onClick={handleClearAll} disabled={bookmarks.length === 0}>
              <i className="bi bi-trash"></i> Clear All
            </button>
          </div>

          {/* Stat Cards */}
          <div className="bookmarks-stats">
            <div className="bookmarks-stat-card b-stat-blue">
              <div className="bookmarks-stat-icon"><i className="bi bi-bookmark-fill"></i></div>
              <div>
                <div className="bookmarks-stat-val">{stats.total}</div>
                <div className="bookmarks-stat-label">Total Bookmarked</div>
                <div className="bookmarks-stat-sub">All saved events</div>
              </div>
            </div>
            <div className="bookmarks-stat-card b-stat-green">
              <div className="bookmarks-stat-icon"><i className="bi bi-calendar2-event"></i></div>
              <div>
                <div className="bookmarks-stat-val">{stats.upcoming}</div>
                <div className="bookmarks-stat-label">Upcoming</div>
                <div className="bookmarks-stat-sub">Happening soon</div>
              </div>
            </div>
            <div className="bookmarks-stat-card b-stat-orange">
              <div className="bookmarks-stat-icon"><i className="bi bi-alarm-fill"></i></div>
              <div>
                <div className="bookmarks-stat-val">{stats.close}</div>
                <div className="bookmarks-stat-label">Close Deadlines</div>
                <div className="bookmarks-stat-sub">Within 7 days</div>
              </div>
            </div>
            <div className="bookmarks-stat-card b-stat-cyan">
              <div className="bookmarks-stat-icon"><i className="bi bi-check-circle-fill"></i></div>
              <div>
                <div className="bookmarks-stat-val">{stats.completed}</div>
                <div className="bookmarks-stat-label">Completed</div>
                <div className="bookmarks-stat-sub">You did it!</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bookmarks-tabs">
            <div className={`bookmarks-tab ${deadlineFilter === 'all'            ? 'active' : ''}`} onClick={() => setDeadlineFilter('all')}>
              <i className="bi bi-bookmark"></i> All Events
            </div>
            <div className={`bookmarks-tab ${deadlineFilter === 'upcoming-only'  ? 'active' : ''}`} onClick={() => setDeadlineFilter('upcoming-only')}>
              <i className="bi bi-calendar"></i> Upcoming
            </div>
            <div className={`bookmarks-tab ${deadlineFilter === 'completed-only' ? 'active' : ''}`} onClick={() => setDeadlineFilter('completed-only')}>
              <i className="bi bi-check-circle"></i> Completed
            </div>
            <div className={`bookmarks-tab ${deadlineFilter === 'archived'       ? 'active' : ''}`} onClick={() => setDeadlineFilter('archived')}>
              <i className="bi bi-archive"></i> Archived
            </div>
          </div>

          {/* Results info */}
          {filteredBookmarks.length > 0 && (
            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Showing <strong>{filteredBookmarks.length}</strong> bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
              {activeCategory !== 'all' && ` in ${CATEGORY_DEFS.find(c => c.key === activeCategory)?.label || activeCategory}`}
            </div>
          )}

          {/* Empty state OR events grid */}
          {filteredBookmarks.length === 0 ? (
            <div className="bookmarks-empty-box">
              <div className="bookmarks-empty-illus"><i className="bi bi-bookmark-fill"></i></div>
              <div className="bookmarks-empty-title">No bookmarks yet</div>
              <div className="bookmarks-empty-text">
                You haven't saved any events yet.<br />
                Start exploring events and bookmark the ones you don't want to miss!
              </div>
              <button className="bookmarks-empty-btn" onClick={() => navigate('/events')}>
                <i className="bi bi-compass"></i> Discover Events
              </button>
            </div>
          ) : (
            <>
              <div className="row g-4 mb-4">
                {paginatedBookmarks.map((ev, idx) => {
                  const key           = ev._id || ev.id || idx;
                  const statusDate    = getStatusDate(ev);
                  const days          = daysUntilDeadline(statusDate);
                  const deadlineStyles = getDeadlineStyles(statusDate);
                  const dateLabel     = ev.deadline ? 'Deadline' : 'Event Date';
                  const todayLabel    = ev.deadline ? 'Deadline is today!' : 'Event is today!';
                  const applyUrl      = ev.applyLink || ev.link || null;

                  return (
                    <div className="col-md-6 col-lg-6 col-xl-4" key={key}>
                      <div
                        onClick={() => handleEventClick(ev)}
                        style={{
                          position: 'relative',
                          border: days !== null && days <= 3
                            ? `2px solid ${deadlineStyles.border}`
                            : '1px solid #e5e7eb',
                          borderRadius: '1.25rem',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s ease',
                          background: '#fff',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.02)'}
                      >
                        {/* EventCard body (no bookmark/action buttons - handled below) */}
                        <div
                          ref={el => contentRefs.current[key] = el}
                          onClick={e => e.stopPropagation()}
                          style={{ flex: 1 }}
                        >
                          <EventCard event={ev} showBookmark={false} showActions={false} />
                        </div>

                        {/* Deadline banner — fixed alignment */}
                        {statusDate && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{
                              padding: '0.75rem 1rem',
                              background: deadlineStyles.bg,
                              borderTop: `2px solid ${deadlineStyles.border}`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                              {/* Left: icon + text */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                <i
                                  className="bi bi-calendar2-check"
                                  style={{ color: deadlineStyles.icon, fontSize: '1.1rem', flexShrink: 0 }}
                                ></i>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: deadlineStyles.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {dateLabel}: {formatDate(statusDate)}
                                  </div>
                                  <div style={{ fontWeight: 600, fontSize: '0.72rem', color: deadlineStyles.text, opacity: 0.8, marginTop: '0.1rem' }}>
                                    {days < 0
                                      ? `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`
                                      : days === 0
                                      ? todayLabel
                                      : `${days} day${days !== 1 ? 's' : ''} remaining`}
                                  </div>
                                </div>
                              </div>
                              {/* Right: badge — fixed width, no overflow */}
                              <span style={{
                                background: deadlineStyles.text,
                                color: '#fff',
                                fontWeight: 700,
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.72rem',
                                borderRadius: '0.5rem',
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                              }}>
                                {getDeadlineBadgeText(statusDate)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons row */}
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            display: 'flex',
                            gap: '0.6rem',
                            padding: '0.75rem 1rem',
                            background: '#fff',
                            borderTop: '1px solid #e5e7eb',
                          }}
                        >
                          {/* Apply Now — same as EventCard */}
                          {applyUrl ? (
                            <a
                              href={applyUrl}
                              className="btn btn-primary flex-fill"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontWeight: 700, fontSize: '0.88rem', borderRadius: '0.75rem' }}
                              onClick={e => e.stopPropagation()}
                            >
                              Apply Now <i className="bi bi-box-arrow-up-right ms-1"></i>
                            </a>
                          ) : (
                            <button
                              className="btn btn-primary flex-fill"
                              disabled
                              style={{ fontWeight: 700, fontSize: '0.88rem', borderRadius: '0.75rem', opacity: 0.55 }}
                            >
                              Apply Now <i className="bi bi-box-arrow-up-right ms-1"></i>
                            </button>
                          )}

                          {/* Unarchive (only in archived tab) */}
                          {deadlineFilter === 'archived' && (
                            <button
                              className="btn btn-outline-primary"
                              style={{ fontWeight: 700, borderRadius: '0.75rem', flexShrink: 0 }}
                              onClick={e => { e.stopPropagation(); handleUnarchive(ev); }}
                            >
                              <i className="bi bi-arrow-counterclockwise"></i>
                            </button>
                          )}

                          {/* Unbookmark */}
                          <button
                            className="btn btn-outline-danger"
                            style={{ fontWeight: 700, borderRadius: '0.75rem', flexShrink: 0 }}
                            onClick={e => {
                              e.stopPropagation();
                              if (window.confirm('Remove this event from bookmarks?')) handleUnbookmarkFromObj(ev);
                            }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            </>
          )}
        </div>
      </div>

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default Bookmarks;