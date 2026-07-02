import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import '../Events.css';

// ── API helper — uses absolute URL (works in production on Render) ──
async function notifFetch(path, options = {}) {
  const token = localStorage.getItem('clockdin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'x-auth-token': token } : {}),
    ...(options.headers || {}),
  };
  return apiFetch(path, { ...options, headers });
}

// ── Time-ago helper ──────────────────────────────────────────
function timeAgo(dateString) {
  if (!dateString) return '';
  const now  = new Date();
  const date = new Date(dateString);
  const sec  = Math.floor((now - date) / 1000);
  if (sec < 60)     return 'Just now';
  if (sec < 3600)   return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)  return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 172800) return 'Yesterday';
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Date grouping ────────────────────────────────────────────
function groupByDate(notifications) {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today - 86_400_000);
  const groups    = { Today: [], Yesterday: [], Earlier: [] };
  notifications.forEach(n => {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    if (d >= today)          groups.Today.push(n);
    else if (d >= yesterday) groups.Yesterday.push(n);
    else                     groups.Earlier.push(n);
  });
  return groups;
}

// ── Type config ──────────────────────────────────────────────
const TYPE_CONFIG = {
  deadline: {
    icon:       'bi-calendar-event',
    iconBg:     '#fff1f2',
    iconColor:  '#ef4444',
    dotColor:   '#ef4444',
    badgeBg:    '#fff1f2',
    badgeColor: '#dc2626',
    badgeBorder:'#fecaca',
    label:      'Deadline',
  },
  reminder: {
    icon:       'bi-bell-fill',
    iconBg:     '#fff7ed',
    iconColor:  '#f97316',
    dotColor:   '#f97316',
    badgeBg:    '#fff7ed',
    badgeColor: '#ea580c',
    badgeBorder:'#fed7aa',
    label:      'Reminder',
  },
  opportunity: {
    icon:       'bi-briefcase-fill',
    iconBg:     '#ecfdf5',
    iconColor:  '#10b981',
    dotColor:   '#10b981',
    badgeBg:    '#ecfdf5',
    badgeColor: '#059669',
    badgeBorder:'#a7f3d0',
    label:      'Opportunity',
  },
  system: {
    icon:       'bi-gear-fill',
    iconBg:     '#eff6ff',
    iconColor:  '#3b82f6',
    dotColor:   '#3b82f6',
    badgeBg:    '#eff6ff',
    badgeColor: '#2563eb',
    badgeBorder:'#bfdbfe',
    label:      'System',
  },
};

// ── Token helper ─────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('clockdin_token');
}

// ── Skeleton item ────────────────────────────────────────────
function NotifSkeleton() {
  const skel = {
    background: 'linear-gradient(90deg, #f3f4f6 25%, #e9ecef 50%, #f3f4f6 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.6s ease-in-out infinite',
    borderRadius: 8,
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '1rem 1.25rem',
      borderBottom: '1px solid #f1f5f9',
    }}>
      {/* dot placeholder */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, ...skel }} />
      {/* icon placeholder */}
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, ...skel }} />
      {/* text placeholder */}
      <div style={{ flex: 1, paddingTop: 4 }}>
        <div style={{ height: 13, width: '45%', marginBottom: 8, ...skel }} />
        <div style={{ height: 11, width: '70%', ...skel }} />
      </div>
      {/* right placeholder */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{ height: 20, width: 80, borderRadius: 20, ...skel }} />
        <div style={{ height: 10, width: 48, ...skel }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
const Notifications = () => {
  const navigate = useNavigate();

  // ── API state ─────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats]                 = useState({ totalUnread: 0, upcoming: 0, closeDeadlines: 0, completed: 0 });
  const [categoryCounts, setCategoryCounts] = useState({ all: 0, deadline: 0, reminder: 0, opportunity: 0, system: 0 });
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [loadingMore, setLoadingMore]     = useState(false);

  // ── Filter / search state ─────────────────────────────────
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [readFilter, setReadFilter]         = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // ── Hover state for items ─────────────────────────────────
  const [hoveredId, setHoveredId]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Preferences state ─────────────────────────────────────
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    eventReminders:     true,
    weeklyDigest:       false,
  });
  const [prefToast, setPrefToast] = useState('');

  // ── Debounce search ───────────────────────────────────────
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // ── Fetch preferences ─────────────────────────────────────
  useEffect(() => {
    if (!getToken()) return;
    notifFetch('/api/users/me')
      .then(r => r.json())
      .then(u => {
        setPreferences({
          emailNotifications: u.emailNotifications !== undefined ? u.emailNotifications : true,
          eventReminders:     u.eventReminders     !== undefined ? u.eventReminders     : true,
          weeklyDigest:       u.weeklyDigest       !== undefined ? u.weeklyDigest       : false,
        });
      })
      .catch(() => {});
  }, []);

  // ── Fetch notifications ───────────────────────────────────
  const fetchNotifications = useCallback(async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else        setLoading(true);
    setError(null);
    if (!getToken()) { setLoading(false); return; }
    try {
      const params = new URLSearchParams({ page: targetPage, limit: 20 });
      if (activeCategory !== 'all') params.set('type', activeCategory);
      if (debouncedSearch.trim())   params.set('search', debouncedSearch.trim());
      if (readFilter === 'unread')  params.set('isRead', 'false');
      if (readFilter === 'read')    params.set('isRead', 'true');

      const res  = await notifFetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (body.success) {
        const { notifications: notifs, stats: s, categoryCounts: cc, pagination } = body.data;
        setNotifications(prev => append ? [...prev, ...notifs] : notifs);
        setStats(s);
        setCategoryCounts(cc);
        setTotalPages(pagination.totalPages);
        setPage(targetPage);
      }
    } catch (err) {
      console.error('[Notifications] fetch error:', err.message);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeCategory, debouncedSearch, readFilter]);

  // Refetch on filter changes
  useEffect(() => {
    fetchNotifications(1, false);
  }, [fetchNotifications]);

  // ── Backfill on first load ────────────────────────────────
  const backfillDone = useRef(false);
  useEffect(() => {
    if (backfillDone.current) return;
    backfillDone.current = true;
    if (!getToken()) return;
    notifFetch('/api/notifications/backfill', { method: 'POST' })
      .then(r => r.json())
      .then(body => { if (body.success && body.created > 0) fetchNotifications(1, false); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ─────────────────────────────────────────────
  const handleMarkRead = async (id, currentlyRead) => {
    if (currentlyRead) return;
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setStats(prev => ({ ...prev, totalUnread: Math.max(0, prev.totalUnread - 1), completed: prev.completed + 1 }));
    try { await notifFetch(`/api/notifications/${id}/read`, { method: 'PUT' }); }
    catch { fetchNotifications(page, false); }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setStats(prev => ({ ...prev, totalUnread: 0, completed: prev.completed + prev.totalUnread }));
    try {
      await notifFetch('/api/notifications/read-all', { method: 'PUT' });
      setPrefToast('All notifications marked as read');
      setTimeout(() => setPrefToast(''), 2500);
    } catch { fetchNotifications(page, false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeletingId(id);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n._id !== id));
      setDeletingId(null);
    }, 200);
    try { await notifFetch(`/api/notifications/${id}`, { method: 'DELETE' }); }
    catch { fetchNotifications(page, false); }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) fetchNotifications(page + 1, true);
  };

  const handlePrefChange = async (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    try {
      await notifFetch('/api/users/profile', { method: 'PUT', body: JSON.stringify({ [key]: value }) });
      setPrefToast('Preference saved');
      setTimeout(() => setPrefToast(''), 2000);
    } catch {
      setPreferences(prev => ({ ...prev, [key]: !value }));
      setPrefToast('Failed to save preference');
      setTimeout(() => setPrefToast(''), 2000);
    }
  };

  const selectCategory = (cat) => { setActiveCategory(cat); setPage(1); };

  // ── Notification item renderer ────────────────────────────
  const renderNotifItem = (n) => {
    const cfg     = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
    const isHover = hoveredId === n._id;
    const isDeleting = deletingId === n._id;

    return (
      <div
        key={n._id}
        onMouseEnter={() => setHoveredId(n._id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => handleMarkRead(n._id, n.isRead)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '0.9rem 1.25rem',
          borderBottom: '1px solid #f1f5f9',
          background: isDeleting
            ? 'rgba(239,68,68,0.06)'
            : !n.isRead
              ? isHover ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.03)'
              : isHover ? '#f8fafc' : '#fff',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.15s ease, opacity 0.2s ease',
          opacity: isDeleting ? 0 : 1,
          borderLeft: !n.isRead ? `3px solid ${cfg.dotColor}` : '3px solid transparent',
        }}
      >
        {/* Single unread dot — only shown when not read */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: !n.isRead ? cfg.dotColor : 'transparent',
          flexShrink: 0, marginTop: 6,
          boxShadow: !n.isRead ? `0 0 0 3px ${cfg.dotColor}22` : 'none',
          transition: 'all 0.2s ease',
        }} />

        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: isHover ? cfg.iconBg : cfg.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transform: isHover ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 0.15s ease',
          boxShadow: isHover ? `0 4px 12px ${cfg.iconColor}25` : 'none',
        }}>
          <i className={`bi ${cfg.icon}`} style={{ fontSize: 15, color: cfg.iconColor }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: !n.isRead ? 700 : 500,
            color: !n.isRead ? '#0f172a' : '#374151',
            lineHeight: 1.35,
            marginBottom: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {n.title}
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: '#6b7280',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {n.message}
          </div>
          {/* Time (mobile) */}
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>
            {timeAgo(n.createdAt)}
          </div>
        </div>

        {/* Right side: badge + time */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', gap: 6, flexShrink: 0,
        }}>
          {/* Badge */}
          <span style={{
            fontSize: '0.68rem', fontWeight: 700,
            padding: '2px 10px', borderRadius: 20,
            background: cfg.badgeBg,
            color: cfg.badgeColor,
            border: `1px solid ${cfg.badgeBorder}`,
            whiteSpace: 'nowrap', letterSpacing: '0.02em',
          }}>
            {cfg.label}
          </span>
          {/* Time (desktop) */}
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
            {timeAgo(n.createdAt)}
          </span>
          {/* External link for events with applyLink */}
          {n.eventId?.applyLink && (
            <button
              onClick={e => { e.stopPropagation(); window.open(n.eventId.applyLink, '_blank'); }}
              style={{
                border: 'none', background: 'transparent', padding: '2px 4px',
                color: isHover ? '#6366f1' : '#d1d5db',
                cursor: 'pointer', transition: 'color 0.15s ease', fontSize: 11,
              }}
              title="Open event"
            >
              <i className="bi bi-box-arrow-up-right" />
            </button>
          )}
        </div>

        {/* Delete button — only visible on hover */}
        <button
          onClick={e => handleDelete(n._id, e)}
          title="Dismiss"
          style={{
            flexShrink: 0, alignSelf: 'flex-start', marginTop: 2,
            width: 28, height: 28, borderRadius: 8,
            border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isHover ? '#ef4444' : '#d1d5db',
            cursor: 'pointer',
            opacity: isHover ? 1 : 0,
            transform: isHover ? 'scale(1)' : 'scale(0.8)',
            transition: 'all 0.15s ease',
            pointerEvents: isHover ? 'auto' : 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <i className="bi bi-x-lg" style={{ fontSize: 12 }} />
        </button>
      </div>
    );
  };

  const grouped = groupByDate(notifications);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="container" style={{ maxWidth: '1500px' }}>

      {/* Toast */}
      {prefToast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#22c55e', color: '#fff', padding: '0.6rem 1.2rem',
          borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.875rem',
          boxShadow: '0 4px 20px rgba(34,197,94,0.35)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.2s ease',
        }}>
          <i className="bi bi-check-circle-fill" />
          {prefToast}
        </div>
      )}

      <div className="notif-dashboard">

        {/* ── SIDEBAR ── */}
        <div className="notif-sidebar d-none d-lg-block">
          <div className="notif-sb-header">
            <div className="notif-sb-icon">
              <i className="bi bi-bell-fill"></i>
            </div>
            <div>
              <div className="notif-sb-title">Notification Center</div>
              <div className="notif-sb-sub">Stay updated with important updates</div>
            </div>
          </div>

          {/* All category shortcut */}
          <div className="notif-cat-list mb-4">
            <div
              className={`notif-cat-item ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => selectCategory('all')}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-bell"></i> All Notifications
              </div>
              <div className="notif-cat-badge">{categoryCounts.all}</div>
            </div>
          </div>

          {/* Categories */}
          <div className="notif-sb-section">
            <div className="notif-sb-section-title">CATEGORIES</div>
            <div className="notif-cat-list">
              {[
                { key: 'all',         icon: 'bi-grid-1x2',      label: 'All',           count: categoryCounts.all },
                { key: 'reminder',    icon: 'bi-bell',           label: 'Reminders',     count: categoryCounts.reminder },
                { key: 'deadline',    icon: 'bi-calendar-event', label: 'Deadlines',     count: categoryCounts.deadline },
                { key: 'opportunity', icon: 'bi-star',           label: 'Opportunities', count: categoryCounts.opportunity },
                { key: 'system',      icon: 'bi-gear',           label: 'System',        count: categoryCounts.system },
              ].map(cat => (
                <div
                  key={cat.key}
                  className={`notif-cat-item ${activeCategory === cat.key ? 'active' : ''}`}
                  onClick={() => selectCategory(cat.key)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className={`bi ${cat.icon}`}></i> {cat.label}
                  </div>
                  <div className="notif-cat-badge">{cat.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="notif-sb-section">
            <div className="notif-sb-section-title">PREFERENCES</div>
            {[
              { key: 'emailNotifications', icon: 'bi-envelope',      label: 'Email Notifications', val: preferences.emailNotifications },
              { key: 'eventReminders',     icon: 'bi-clock-history', label: 'Deadline Reminders',  val: preferences.eventReminders },
              { key: 'weeklyDigest',       icon: 'bi-megaphone',     label: 'Marketing Updates',   val: preferences.weeklyDigest },
            ].map(pref => (
              <div className="notif-toggle-item" key={pref.key}>
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi ${pref.icon}`}></i> {pref.label}
                </div>
                <div
                  className={`notif-toggle ${pref.val ? 'active' : ''}`}
                  onClick={() => handlePrefChange(pref.key, !pref.val)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="notif-toggle-thumb"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Mark all as read */}
          <button
            className="myevents-btn-secondary w-100 justify-content-center mt-3"
            style={{ color: '#4f46e5', borderColor: '#eef2ff', background: '#fff', fontWeight: 600 }}
            onClick={handleMarkAllRead}
            disabled={stats.totalUnread === 0}
          >
            <i className="bi bi-check2-all me-1"></i> Mark all as read
          </button>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div>
          {/* Header */}
          <div className="notif-header">
            <div>
              <div className="notif-header-title">
                Notifications <span className="notif-header-badge">{stats.totalUnread}</span>
              </div>
              <div className="notif-header-sub">Stay informed about deadlines, events and opportunities</div>
            </div>
            <div className="notif-header-actions">
              <div className="notif-search">
                <i className="bi bi-search"></i>
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  className="notif-filter-btn"
                  onClick={() => setShowFilterMenu(prev => !prev)}
                >
                  <i className="bi bi-funnel"></i> Filter
                  {readFilter !== 'all' && (
                    <span style={{
                      marginLeft: 4, background: '#3b5bfd', color: '#fff',
                      borderRadius: '50%', width: 16, height: 16, fontSize: 10,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>1</span>
                  )}
                </button>
                {showFilterMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: '110%', zIndex: 200,
                    background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 160, padding: '0.5rem',
                  }}>
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'unread', label: 'Unread only' },
                      { key: 'read', label: 'Read only' },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => { setReadFilter(f.key); setShowFilterMenu(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '0.5rem 0.75rem', border: 'none', borderRadius: '0.5rem',
                          background: readFilter === f.key ? '#eef2ff' : 'transparent',
                          color: readFilter === f.key ? '#3b5bfd' : '#374151',
                          fontWeight: readFilter === f.key ? 700 : 500,
                          cursor: 'pointer', fontSize: '0.875rem',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="myevents-btn-secondary"
                style={{ color: '#4f46e5', borderColor: '#eef2ff', background: '#fff', fontWeight: 600, padding: '0.5rem 1rem' }}
                onClick={handleMarkAllRead}
                disabled={stats.totalUnread === 0}
              >
                <i className="bi bi-check2-all me-1"></i> Mark all as read
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="notif-stats">
            <div className="bookmarks-stat-card b-stat-purple" style={{ borderColor: '#f3e8ff' }}>
              <div className="bookmarks-stat-icon" style={{ background: '#f3e8ff', color: '#a855f7' }}>
                <i className="bi bi-bell-fill"></i>
              </div>
              <div>
                <div className="bookmarks-stat-val">{stats.totalUnread}</div>
                <div className="bookmarks-stat-label">Total Unread</div>
                <div className="bookmarks-stat-sub">Stay on top</div>
              </div>
            </div>
            <div className="bookmarks-stat-card b-stat-green" style={{ borderColor: '#dcfce7' }}>
              <div className="bookmarks-stat-icon" style={{ background: '#dcfce7', color: '#22c55e' }}>
                <i className="bi bi-calendar-event"></i>
              </div>
              <div>
                <div className="bookmarks-stat-val">{stats.upcoming}</div>
                <div className="bookmarks-stat-label">Upcoming</div>
                <div className="bookmarks-stat-sub">Happening soon</div>
              </div>
            </div>
            <div className="bookmarks-stat-card b-stat-orange" style={{ borderColor: '#ffedd5' }}>
              <div className="bookmarks-stat-icon" style={{ background: '#ffedd5', color: '#f97316' }}>
                <i className="bi bi-alarm-fill"></i>
              </div>
              <div>
                <div className="bookmarks-stat-val">{stats.closeDeadlines}</div>
                <div className="bookmarks-stat-label">Close Deadlines</div>
                <div className="bookmarks-stat-sub">Within 7 days</div>
              </div>
            </div>
            <div className="bookmarks-stat-card b-stat-blue" style={{ borderColor: '#e0f2fe' }}>
              <div className="bookmarks-stat-icon" style={{ background: '#e0f2fe', color: '#0ea5e9' }}>
                <i className="bi bi-check-circle-fill"></i>
              </div>
              <div>
                <div className="bookmarks-stat-val">{stats.completed}</div>
                <div className="bookmarks-stat-label">Completed</div>
                <div className="bookmarks-stat-sub">You're all set!</div>
              </div>
            </div>
          </div>

          {/* ── Notification list container ── */}
          <div style={{
            background: '#fff',
            borderRadius: '1rem',
            border: '1px solid #f1f5f9',
            overflow: 'hidden',
            boxShadow: '0 1px 16px rgba(0,0,0,0.06)',
          }}>

            {/* Loading skeletons */}
            {loading && (
              <div>
                {[1, 2, 3, 4, 5, 6].map(i => <NotifSkeleton key={i} />)}
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="notif-empty-state">
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: '#fff1f2', border: '1px solid #fecaca',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1.75rem', color: '#f87171' }} />
                </div>
                <h3 style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Something went wrong</h3>
                <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.875rem' }}>
                  {error}
                </p>
                <button
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: '#6366f1', color: '#fff', border: 'none',
                    borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.875rem',
                    padding: '0.65rem 1.5rem', cursor: 'pointer',
                  }}
                  onClick={() => fetchNotifications(1, false)}
                >
                  <i className="bi bi-arrow-clockwise" /> Try again
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && notifications.length === 0 && (
              <div className="notif-empty-state">
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}>
                  <i className="bi bi-bell-slash" style={{ fontSize: '1.75rem', color: '#94a3b8' }} />
                </div>
                <h3 style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>All caught up!</h3>
                <p style={{ color: '#64748b', maxWidth: '380px', margin: '0 auto 1.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {debouncedSearch || activeCategory !== 'all' || readFilter !== 'all'
                    ? `No ${activeCategory !== 'all' ? activeCategory : ''} notifications match your filters.`
                    : 'You have no notifications. Tap "Notify Me" on events to get deadline reminders here.'}
                </p>
                {!debouncedSearch && activeCategory === 'all' && readFilter === 'all' && (
                  <button
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: '#6366f1', color: '#fff', border: 'none',
                      borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.875rem',
                      padding: '0.65rem 1.5rem', cursor: 'pointer',
                    }}
                    onClick={() => navigate('/events')}
                  >
                    Explore events <i className="bi bi-arrow-right" />
                  </button>
                )}
              </div>
            )}

            {/* Grouped notification list */}
            {!loading && !error && notifications.length > 0 && (
              <>
                {Object.entries(grouped).map(([groupLabel, items]) => {
                  if (!items.length) return null;
                  return (
                    <div key={groupLabel}>
                      {/* Date group header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '0.6rem 1.25rem',
                        background: '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                        position: 'sticky', top: 0, zIndex: 10,
                        backdropFilter: 'blur(8px)',
                      }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          color: '#94a3b8',
                        }}>
                          {groupLabel}
                        </span>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {items.length} notification{items.length !== 1 ? 's' : ''}
                        </span>
                        {groupLabel === 'Today' && stats.totalUnread > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            style={{
                              border: 'none', background: 'transparent',
                              color: '#6366f1', fontSize: '0.75rem', fontWeight: 600,
                              cursor: 'pointer', padding: '2px 0',
                            }}
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      {/* Items */}
                      {items.map(n => renderNotifItem(n))}
                    </div>
                  );
                })}

                {/* Load more */}
                <div style={{ padding: '1.25rem', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                  {page < totalPages ? (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: '#eef2ff', color: '#4f46e5',
                        border: '1px solid #c7d2fe',
                        borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.875rem',
                        padding: '0.6rem 1.5rem', cursor: loadingMore ? 'not-allowed' : 'pointer',
                        opacity: loadingMore ? 0.7 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {loadingMore
                        ? <><i className="bi bi-arrow-clockwise" style={{ animation: 'spin 0.8s linear infinite' }} /> Loading...</>
                        : <><i className="bi bi-chevron-down" /> Load more</>
                      }
                    </button>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                      You've seen all notifications
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
