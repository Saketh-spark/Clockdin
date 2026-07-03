import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiAxios } from '../utils/api';
import '../Events.css';

const initialForm = {
  title: '',
  description: '',
  date: '',
  time: '',
  category: 'Personal',
  location: '',
  reminder: 'No reminder',
};

const categories = [
  { label: 'Personal', icon: 'bi-person-fill' },
  { label: 'Academic', icon: 'bi-book-fill' },
  { label: 'Sports', icon: 'bi-trophy-fill' },
  { label: 'Work', icon: 'bi-briefcase-fill' },
  { label: 'Meeting', icon: 'bi-camera-video-fill' },
  { label: 'Other', icon: 'bi-three-dots' },
];

const reminders = [
  'No reminder',
  'On time',
  '5 minutes before',
  '10 minutes before',
  '30 minutes before',
  '1 hour before',
  '1 day before',
];

const colorMap = {
  Personal: 'blue',
  Academic: 'purple',
  Sports: 'orange',
  Work: 'red',
  Meeting: 'green',
  Other: 'blue',
};

/** Parse a date + optional time string into a Date object */
const parseEventDate = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const hasIsoTime = dateStr.includes('T');
  const dateOnly = hasIsoTime ? dateStr.split('T')[0] : dateStr;
  const isoTimePart = hasIsoTime ? (dateStr.split('T')[1] || '').replace('Z', '').trim() : '';
  const timeCandidate = timeStr || isoTimePart || '';
  try {
    const dt = timeCandidate
      ? new Date(`${dateOnly}T${timeCandidate}`)
      // No time given: treat as expiring at end-of-day so it stays
      // in "upcoming" for the full calendar day
      : new Date(`${dateOnly}T23:59:59`);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
};

/** Format date for display */
const formatDateTime = (dateStr, timeStr) => {
  const dt = parseEventDate(dateStr, timeStr);
  if (!dt) return { dateLabel: 'Date TBD', timeLabel: '', dt: null };

  const hasIsoTime = dateStr && dateStr.includes('T');
  const isoTimePart = hasIsoTime ? (dateStr.split('T')[1] || '').replace('Z', '').trim() : '';
  const timeCandidate = timeStr || isoTimePart || '';

  const dateLabel = dt.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
  const timeLabel = timeCandidate
    ? dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  return { dateLabel, timeLabel, dt };
};

const getCategoryIcon = (catName) => {
  const cat = categories.find(c => c.label === catName);
  return cat ? cat.icon : 'bi-tag-fill';
};

const CACHE_KEY = () =>
  `clockdin_myevents_${localStorage.getItem('clockdin_token')?.slice(-8) || 'guest'}`;

/** Get start-of-day for today */
const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const MyEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // index to delete
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [timeFilter, setTimeFilter] = useState('All Time');
  const [sortOrder, setSortOrder] = useState('Upcoming');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);

  // Calendar navigation: store offset in months from current
  const [calendarOffset, setCalendarOffset] = useState(0);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    // Show cached data immediately
    try {
      const cached = localStorage.getItem(CACHE_KEY());
      if (cached) {
        setEvents(JSON.parse(cached));
        setLoading(false);
      }
    } catch (_) {}

    try {
      const token = localStorage.getItem('clockdin_token');
      const res = await apiAxios.get('/api/users/myevents', {
        headers: { 'x-auth-token': token },
      });
      setEvents(res.data);
      localStorage.setItem(CACHE_KEY(), JSON.stringify(res.data));
    } catch (err) {
      // Keep cached data visible; silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openModal = () => { setForm(initialForm); setShowModal(true); };
  const closeModal = () => setShowModal(false);
  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Add Event ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.title.trim()) { alert('Please enter a title.'); return; }
    if (!form.date) { alert('Please select a date.'); return; }
    if (!form.time) { alert('Please select a time.'); return; }

    setSubmitting(true);
    setShowModal(false);

    // Normalize date to YYYY-MM-DD
    let eventDate = form.date;
    if (eventDate && !/\d{4}-\d{2}-\d{2}/.test(eventDate)) {
      const parts = eventDate.split('-');
      if (parts.length === 3) {
        eventDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Optimistic update
    const optimisticEvent = {
      _optimistic: true,
      title: form.title.trim(),
      description: form.description.trim(),
      date: eventDate,
      time: form.time,
      location: form.location.trim(),
      category: form.category,
      reminder: form.reminder,
    };
    const optimisticList = [...events, optimisticEvent];
    setEvents(optimisticList);
    localStorage.setItem(CACHE_KEY(), JSON.stringify(optimisticList));

    try {
      const token = localStorage.getItem('clockdin_token');

      // Build a UTC ISO string so the server never needs to guess timezone
      let eventUtcISO = null;
      if (eventDate && form.time) {
        const localDt = new Date(`${eventDate}T${form.time}`);
        if (!isNaN(localDt.getTime())) eventUtcISO = localDt.toISOString();
      }

      const res = await apiAxios.post(
        '/api/users/myevents',
        {
          title: form.title.trim(),
          description: form.description.trim(),
          date: eventDate,
          time: form.time,
          location: form.location.trim(),
          category: form.category,
          reminder: form.reminder,
          eventUtcISO,          // ← UTC ISO string for precise reminder scheduling
        },
        { headers: { 'x-auth-token': token } }
      );
      setEvents(res.data);
      localStorage.setItem(CACHE_KEY(), JSON.stringify(res.data));
    } catch (err) {
      // Rollback optimistic update
      const rolled = optimisticList.filter(ev => !ev._optimistic);
      setEvents(rolled);
      localStorage.setItem(CACHE_KEY(), JSON.stringify(rolled));
      setShowModal(true);
      alert('Failed to add event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete single event ───────────────────────────────────────────────────
  const handleDeleteEvent = async (idx) => {
    setConfirmDelete(null);
    const prev = [...events];
    const next = prev.filter((_, i) => i !== idx);
    setEvents(next);
    localStorage.setItem(CACHE_KEY(), JSON.stringify(next));
    try {
      const token = localStorage.getItem('clockdin_token');
      await apiAxios.delete(`/api/users/myevents/${idx}`, {
        headers: { 'x-auth-token': token },
      });
    } catch (err) {
      setEvents(prev);
      localStorage.setItem(CACHE_KEY(), JSON.stringify(prev));
      alert('Failed to delete event. Please try again.');
    }
  };

  // ── Clear all events ───────────────────────────────────────────────────────
  const handleClearAll = async () => {
    setConfirmClearAll(false);
    const prev = [...events];
    setEvents([]);
    localStorage.setItem(CACHE_KEY(), JSON.stringify([]));
    try {
      const token = localStorage.getItem('clockdin_token');
      // Delete in reverse index order
      for (let i = prev.length - 1; i >= 0; i--) {
        await apiAxios.delete(`/api/users/myevents/${i}`, {
          headers: { 'x-auth-token': token },
        });
      }
    } catch (err) {
      setEvents(prev);
      localStorage.setItem(CACHE_KEY(), JSON.stringify(prev));
      alert('Failed to clear events. Please try again.');
    }
  };

  // ── Derived event lists ───────────────────────────────────────────────────
  const {
    upcomingEvents,
    pastEvents,
    upcomingCount,
    completedCount,
    remindersCount,
    nextEvent,
    upcomingSoon,
  } = useMemo(() => {

    // Assign each event its index in the original array and parsed date
    const indexed = events.map((ev, i) => ({
      ...ev,
      originalIndex: i,
      _dt: parseEventDate(ev.date, ev.time),
    }));

    // Sort chronologically
    const sorted = [...indexed].sort((a, b) => {
      const da = a._dt ? a._dt.getTime() : Infinity;
      const db = b._dt ? b._dt.getTime() : Infinity;
      return da - db;
    });

    const upcoming = [];
    const past = [];
    const nowExact = new Date(); // current exact time for next-event calculation

    sorted.forEach((ev) => {
      // An event is "past" as soon as its exact datetime has passed
      // (compares against current time, not just midnight)
      const isPast = ev._dt && ev._dt < nowExact;
      if (isPast) past.push(ev);
      else upcoming.push(ev);
    });

    // Most-recent past event first
    past.reverse();

    // Reminders: only count UPCOMING events that have an active reminder
    const remCount = upcoming.filter(
      ev => ev.reminder && ev.reminder !== 'No reminder'
    ).length;

    // Next event: the nearest upcoming event whose time is still in the future
    // (e.g., an event at 09:09 AM should not be "next" if it's now 09:15 AM)
    const strictlyFutureNext = upcoming.find(ev => ev._dt && ev._dt > nowExact) || null;

    return {
      upcomingEvents: upcoming,
      pastEvents: past,
      upcomingCount: upcoming.length,
      completedCount: past.length,
      remindersCount: remCount,
      nextEvent: strictlyFutureNext,
      upcomingSoon: upcoming.slice(0, 3),
    };
  }, [events]);

  // ── Filter + sort helpers ─────────────────────────────────────────────────
  const applyFilters = (list) => {
    const todayStart = startOfDay();
    const endOfWeek = new Date(todayStart);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59);

    return list.filter(ev => {
      // Search
      if (
        search &&
        !(ev.title || '').toLowerCase().includes(search.toLowerCase()) &&
        !(ev.description || '').toLowerCase().includes(search.toLowerCase())
      ) return false;

      // Category
      if (categoryFilter !== 'All Categories' && ev.category !== categoryFilter) return false;

      // Time filter
      if (timeFilter === 'This Week') {
        if (!ev._dt || ev._dt < todayStart || ev._dt > endOfWeek) return false;
      } else if (timeFilter === 'This Month') {
        if (!ev._dt || ev._dt < todayStart || ev._dt > endOfMonth) return false;
      }

      return true;
    });
  };

  const sortList = (list) => {
    const copy = [...list];
    if (sortOrder === 'Latest') {
      copy.sort((a, b) => {
        const da = a._dt ? a._dt.getTime() : 0;
        const db = b._dt ? b._dt.getTime() : 0;
        return db - da; // descending
      });
    } else {
      // 'Upcoming' — ascending (already sorted from useMemo, but keep deterministic)
      copy.sort((a, b) => {
        const da = a._dt ? a._dt.getTime() : Infinity;
        const db = b._dt ? b._dt.getTime() : Infinity;
        return da - db;
      });
    }
    return copy;
  };

  const displayUpcoming = sortList(applyFilters(upcomingEvents));
  const displayPast = sortList(applyFilters(pastEvents));

  // ── Calendar ──────────────────────────────────────────────────────────────
  const calendarDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + calendarOffset);
    return d;
  }, [calendarOffset]);

  const calendarMonth = calendarDate.toLocaleString('default', { month: 'long' });
  const calendarYear = calendarDate.getFullYear();

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const today = new Date();
    const todayStr = today.toDateString();

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ num: '', empty: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const hasEvent = events.some(ev => {
        const edt = parseEventDate(ev.date, ev.time);
        return edt && edt.toDateString() === d.toDateString();
      });
      const isToday = d.toDateString() === todayStr;
      days.push({ num: i, hasEvent, active: isToday });
    }
    return days;
  }, [calendarDate, events]);

  // ── Next event display ─────────────────────────────────────────────────────
  const nextEventDisplay = useMemo(() => {
    // If no strictly-future next event, show a friendly empty state
    if (!nextEvent) {
      return { timeLine: 'All clear!', subLine: 'No upcoming events' };
    }
    const { dateLabel, timeLabel, dt } = formatDateTime(nextEvent.date, nextEvent.time);
    const todayStart = startOfDay();
    const tomorrow = new Date(todayStart); tomorrow.setDate(todayStart.getDate() + 1);

    let timeLine = timeLabel || dateLabel;
    let subLine = nextEvent.title;

    if (dt) {
      const diffMs = dt - todayStart;
      const diffDays = Math.ceil(diffMs / 86400000);
      if (dt.toDateString() === new Date().toDateString()) {
        // Same day — show clock time
        timeLine = timeLabel || 'Today';
      } else if (dt.toDateString() === tomorrow.toDateString()) {
        timeLine = timeLabel ? `Tomorrow ${timeLabel}` : 'Tomorrow';
      } else if (diffDays <= 7) {
        timeLine = `${diffDays}d away`;
      } else {
        timeLine = dateLabel;
      }
    }
    return { timeLine, subLine };
  }, [nextEvent]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="container myevents-wrapper">

      {/* ── PAGE HEADER ── */}
      <div className="myevents-section-header mb-4">
        <div>
          <h1 className="myevents-header-title">
            My Events <span style={{ fontSize: '1.8rem' }}>👋</span>
          </h1>
          <div className="myevents-header-subtitle">
            Manage your schedule, deadlines, and important dates all in one place.
          </div>
        </div>
        <div className="myevents-header-actions">
          <button className="myevents-btn-primary" onClick={openModal}>
            <i className="bi bi-plus-lg"></i> Add Event
          </button>
          <button
            className="myevents-btn-outline"
            onClick={() => setConfirmClearAll(true)}
            disabled={events.length === 0}
          >
            <i className="bi bi-trash3"></i> Clear All
          </button>
        </div>
      </div>

      {/* ── FILTER ROW ── */}
      <div className="myevents-filters">
        <div className="myevents-search">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Search events by title or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="myevents-dropdown"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option>All Categories</option>
          {categories.map(c => <option key={c.label}>{c.label}</option>)}
        </select>
        <select
          className="myevents-dropdown"
          value={timeFilter}
          onChange={e => setTimeFilter(e.target.value)}
        >
          <option>All Time</option>
          <option>This Week</option>
          <option>This Month</option>
        </select>
        <select
          className="myevents-dropdown sort"
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
        >
          <option value="Upcoming">Sort: Upcoming First</option>
          <option value="Latest">Sort: Latest First</option>
        </select>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="myevents-stats">
        <div className="myevents-stat-card purple">
          <div className="myevents-stat-icon">
            <i className="bi bi-calendar2-week"></i>
          </div>
          <div className="myevents-stat-content">
            <div className="myevents-stat-title">Upcoming</div>
            <div className="myevents-stat-value">{upcomingCount}</div>
            <div className="myevents-stat-sub">Events ahead</div>
          </div>
        </div>

        <div className="myevents-stat-card orange">
          <div className="myevents-stat-icon">
            <i className="bi bi-clock"></i>
          </div>
          <div className="myevents-stat-content">
            <div className="myevents-stat-title">Next Event</div>
            <div className="myevents-stat-value" style={{ fontSize: '1.2rem' }}>
              {nextEventDisplay.timeLine}
            </div>
            <div className="myevents-stat-sub" title={nextEventDisplay.subLine}>
              {nextEventDisplay.subLine}
            </div>
          </div>
        </div>

        <div className="myevents-stat-card green">
          <div className="myevents-stat-icon">
            <i className="bi bi-check-circle"></i>
          </div>
          <div className="myevents-stat-content">
            <div className="myevents-stat-title">Completed</div>
            <div className="myevents-stat-value">{completedCount}</div>
            <div className="myevents-stat-sub">Events finished</div>
          </div>
        </div>

        <div className="myevents-stat-card blue">
          <div className="myevents-stat-icon">
            <i className="bi bi-bell"></i>
          </div>
          <div className="myevents-stat-content">
            <div className="myevents-stat-title">Reminders</div>
            <div className="myevents-stat-value">{remindersCount}</div>
            <div className="myevents-stat-sub">Active reminders</div>
          </div>
        </div>
      </div>

      {/* ── DASHBOARD GRID ── */}
      <div className="myevents-dashboard">

        {/* LEFT COLUMN — events */}
        <div>

          {/* Upcoming Events */}
          <div className="myevents-section-header mb-3">
            <h3>Upcoming Events</h3>
            <span className="myevents-view-all">
              {displayUpcoming.length} event{displayUpcoming.length !== 1 ? 's' : ''}
              <i className="bi bi-arrow-right-short"></i>
            </span>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#6366f1' }}></div>
              <div className="mt-2 text-muted">Loading your events…</div>
            </div>
          ) : displayUpcoming.length > 0 ? (
            displayUpcoming.map(ev => {
              const { dateLabel, timeLabel } = formatDateTime(ev.date, ev.time);
              const icon = getCategoryIcon(ev.category);
              return (
                <div className="myevents-large-card" key={ev.originalIndex}>
                  <div className="myevents-lc-icon-box">
                    <i className={`bi ${icon}`}></i>
                  </div>
                  <div className="myevents-lc-details">
                    <div className="myevents-lc-tag">{ev.category || 'Other'}</div>
                    <div className="myevents-lc-title" title={ev.title}>{ev.title}</div>
                    <div className="myevents-lc-meta">
                      <span>
                        <i className="bi bi-calendar-event"></i>
                        {dateLabel}{timeLabel && ` at ${timeLabel}`}
                      </span>
                      {ev.location && (
                        <span>
                          <i className="bi bi-geo-alt"></i> {ev.location}
                        </span>
                      )}
                    </div>
                    {ev.reminder && ev.reminder !== 'No reminder' && (
                      <div className="myevents-lc-reminder">
                        <i className="bi bi-bell-fill"></i> {ev.reminder}
                      </div>
                    )}
                    {ev.description && (
                      <div style={{ marginTop: '0.6rem', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                        {ev.description}
                      </div>
                    )}
                    {/* Badge lives inside details so it stays aligned with content */}
                    <div style={{ marginTop: '0.75rem' }}>
                      <div className="myevents-status-badge upcoming" style={{ display: 'inline-flex' }}>
                        <i className="bi bi-clock"></i> Upcoming
                      </div>
                    </div>
                  </div>
                  <div className="myevents-lc-right" style={{ justifyContent: 'flex-start' }}>
                    <button
                      className="myevents-options-btn"
                      onClick={() => setConfirmDelete(ev.originalIndex)}
                      title="Delete event"
                    >
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="myevents-empty">
              <i className="bi bi-calendar-x"></i>
              {search || categoryFilter !== 'All Categories' || timeFilter !== 'All Time'
                ? 'No events match your filters.'
                : 'No upcoming events yet. Click "+ Add Event" to get started!'}
            </div>
          )}

          {/* Past Events */}
          <div className="myevents-section-header mt-5 mb-3">
            <h3>Past Events</h3>
            <span className="myevents-view-all">
              {displayPast.length} event{displayPast.length !== 1 ? 's' : ''}
              <i className="bi bi-arrow-right-short"></i>
            </span>
          </div>

          {displayPast.length > 0 ? (
            displayPast.map(ev => {
              const { dateLabel, timeLabel } = formatDateTime(ev.date, ev.time);
              const icon = getCategoryIcon(ev.category);
              const color = colorMap[ev.category] || 'blue';
              return (
                <div className="myevents-list-item" key={ev.originalIndex}>
                  <div className={`myevents-li-icon ${color}`}>
                    <i className={`bi ${icon}`}></i>
                  </div>
                  <div className="myevents-li-content">
                    <div className={`myevents-li-tag ${color}`}>{ev.category || 'Other'}</div>
                    <div className="myevents-li-title" title={ev.title}>{ev.title}</div>
                    <div className="myevents-li-meta">
                      <span>
                        <i className="bi bi-calendar-event me-1"></i>
                        {dateLabel}{timeLabel && ` at ${timeLabel}`}
                      </span>
                      {ev.location && (
                        <span><i className="bi bi-geo-alt me-1"></i>{ev.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="myevents-li-right">
                    <div className="myevents-status-badge">
                      <i className="bi bi-check-circle"></i> Completed
                    </div>
                    <button
                      className="myevents-options-btn"
                      onClick={() => setConfirmDelete(ev.originalIndex)}
                      title="Delete event"
                    >
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="myevents-empty">
              <i className="bi bi-clock-history"></i>
              No past events recorded.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — sidebar */}
        <div className="myevents-sidebar d-none d-xl-flex">

          {/* Calendar */}
          <div className="myevents-calendar">
            <div className="myevents-cal-header">
              <button
                className="myevents-cal-nav-btn"
                onClick={() => setCalendarOffset(o => o - 1)}
                title="Previous month"
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <span>{calendarMonth} {calendarYear}</span>
              <button
                className="myevents-cal-nav-btn"
                onClick={() => setCalendarOffset(o => o + 1)}
                title="Next month"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
            <div className="myevents-cal-grid">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="myevents-cal-day-name">{d}</div>
              ))}
              {calendarDays.map((d, i) => (
                <div
                  key={i}
                  className={`myevents-cal-day${d.active ? ' active' : ''}${d.hasEvent ? ' has-event' : ''}${d.empty ? ' empty' : ''}`}
                >
                  {d.num}
                </div>
              ))}
            </div>
            {calendarOffset !== 0 && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setCalendarOffset(0)}
                  style={{
                    background: 'none', border: 'none',
                    color: '#6366f1', fontSize: '0.78rem',
                    fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Back to today
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Soon */}
          <div>
            <div className="myevents-section-header mb-2">
              <h3 style={{ fontSize: '1rem' }}>Upcoming Soon</h3>
              <span className="myevents-view-all" style={{ fontSize: '0.8rem' }}>
                Top 3 <i className="bi bi-arrow-right-short"></i>
              </span>
            </div>
            <div className="myevents-sidebar-list">
              {upcomingSoon.length > 0 ? (
                upcomingSoon.map((ev, i) => {
                  const { dateLabel, timeLabel } = formatDateTime(ev.date, ev.time);
                  const icon = getCategoryIcon(ev.category);
                  const today = startOfDay();
                  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

                  let whenLabel = dateLabel;
                  if (ev._dt) {
                    if (ev._dt.toDateString() === new Date().toDateString()) whenLabel = timeLabel || 'Today';
                    else if (ev._dt.toDateString() === tomorrow.toDateString()) whenLabel = 'Tomorrow';
                  }

                  return (
                    <div className="myevents-sidebar-item" key={i}>
                      <div className="myevents-si-icon">
                        <i className={`bi ${icon}`}></i>
                      </div>
                      <div className="myevents-si-content">
                        <div className="myevents-si-title" title={ev.title}>{ev.title}</div>
                        <div className="myevents-si-time">{whenLabel}</div>
                      </div>
                      {ev.reminder && ev.reminder !== 'No reminder' && (
                        <div className="myevents-si-badge orange">
                          <i className="bi bi-bell"></i>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                  No upcoming events.
                </div>
              )}
            </div>
          </div>

          {/* Promo card */}
          <div className="myevents-promo">
            <div className="myevents-promo-title">🚀 Stay on top of your schedule</div>
            <div className="myevents-promo-text">
              Add events and get reminded so you never miss what matters most.
            </div>
            <button className="myevents-promo-btn" onClick={openModal}>
              + Add Event
            </button>
          </div>
        </div>
      </div>

      {/* ── FLOATING ACTION BUTTON ── */}
      <button className="myevents-fab" onClick={openModal} title="Add new event">
        <i className="bi bi-plus-lg"></i>
      </button>

      {/* ─────────────────── ADD EVENT MODAL ─────────────────── */}
      {showModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', background: 'rgba(15,23,42,0.45)', zIndex: 1050 }}
          tabIndex="-1"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540 }}>
            <div className="modal-content" style={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ padding: '1.75rem 2rem 1.5rem' }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: '#0f172a', margin: 0 }}>
                    <i className="bi bi-calendar-plus me-2" style={{ color: '#6366f1' }}></i>
                    Add New Event
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    disabled={submitting}
                  ></button>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Create a personal event to track important dates and deadlines.
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Event Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="title"
                      placeholder="e.g., Assignment Deadline, Cricket Match"
                      value={form.title}
                      onChange={handleChange}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      name="description"
                      rows={2}
                      placeholder="Add more details about your event…"
                      value={form.description}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="row mb-3">
                    <div className="col">
                      <label className="form-label fw-semibold">Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col">
                      <label className="form-label fw-semibold">Time *</label>
                      <input
                        type="time"
                        className="form-control"
                        name="time"
                        value={form.time}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Category</label>
                    <select
                      className="form-select"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                    >
                      {categories.map(cat => (
                        <option key={cat.label} value={cat.label}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Location (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      name="location"
                      placeholder="e.g., Library, Sports Ground, Online"
                      value={form.location}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Reminder</label>
                    <select
                      className="form-select"
                      name="reminder"
                      value={form.reminder}
                      onChange={handleChange}
                    >
                      {reminders.map(rem => (
                        <option key={rem} value={rem}>{rem}</option>
                      ))}
                    </select>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4"
                      onClick={closeModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="myevents-btn-primary"
                      disabled={submitting}
                    >
                      {submitting
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Adding…</>
                        : <><i className="bi bi-check-lg me-1"></i>Add Event</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── DELETE CONFIRM MODAL ─────────────────── */}
      {confirmDelete !== null && (
        <div
          className="modal fade show"
          style={{ display: 'block', background: 'rgba(15,23,42,0.45)', zIndex: 1050 }}
          tabIndex="-1"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 380 }}>
            <div className="modal-content" style={{ borderRadius: '1.25rem', border: 'none', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗑️</div>
              <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                Delete this event?
              </h5>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                This action cannot be undone. The event will be permanently removed.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <button
                  className="btn btn-outline-secondary px-4"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger px-4"
                  onClick={() => handleDeleteEvent(confirmDelete)}
                >
                  <i className="bi bi-trash3 me-1"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── CLEAR ALL CONFIRM MODAL ─────────────────── */}
      {confirmClearAll && (
        <div
          className="modal fade show"
          style={{ display: 'block', background: 'rgba(15,23,42,0.45)', zIndex: 1050 }}
          tabIndex="-1"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmClearAll(false); }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 400 }}>
            <div className="modal-content" style={{ borderRadius: '1.25rem', border: 'none', padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                Clear all events?
              </h5>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                All {events.length} personal event{events.length !== 1 ? 's' : ''} will be permanently deleted. This cannot be undone.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <button
                  className="btn btn-outline-secondary px-4"
                  onClick={() => setConfirmClearAll(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger px-4"
                  onClick={handleClearAll}
                >
                  <i className="bi bi-trash3 me-1"></i>Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEvents;
