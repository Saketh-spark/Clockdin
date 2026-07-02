import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';

const NOTIFY_IDS_KEY = 'clockdin_notify_ids';

function getStoredNotifyIds() {
  try { return JSON.parse(localStorage.getItem(NOTIFY_IDS_KEY) || '[]'); } catch { return []; }
}
function saveNotifyIds(ids) {
  localStorage.setItem(NOTIFY_IDS_KEY, JSON.stringify(ids));
}

const EventCard = ({ event, onBookmark, isBookmarked, showBookmark = false, onClick, showActions = true }) => {
  const [subscribed, setSubscribed] = useState(() => getStoredNotifyIds().includes(String(event._id)));
  const [loadingNotify, setLoadingNotify] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const shareWrapperRef = useRef(null);
  const copyTimerRef = useRef(null);

  // Sync subscription state with server on mount
  useEffect(() => {
    const token = localStorage.getItem('clockdin_token');
    if (!token) return;

    // Check local cache first for instant UI
    const cached = getStoredNotifyIds();
    setSubscribed(cached.includes(String(event._id)));

    // Then verify against server
    apiFetch('/api/notify-me', { headers: { 'x-auth-token': token } })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.eventIds) {
          saveNotifyIds(data.data.eventIds);
          setSubscribed(data.data.eventIds.includes(String(event._id)));
        }
      })
      .catch(() => {}); // Silently fail — use cache
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event._id]);

  // Listen for notify list changes from other cards
  useEffect(() => {
    const refresh = () => {
      const ids = getStoredNotifyIds();
      setSubscribed(ids.includes(String(event._id)));
    };
    window.addEventListener('notify-ids-changed', refresh);
    return () => window.removeEventListener('notify-ids-changed', refresh);
  }, [event._id]);


  const toggleNotify = async (e) => {
    e.stopPropagation();
    if (loadingNotify) return;

    const token = localStorage.getItem('clockdin_token');
    if (!token) {
      alert('Please log in to enable notifications.');
      return;
    }

    setLoadingNotify(true);
    const targetState = !subscribed;

    // Optimistic update
    setSubscribed(targetState);
    const prevIds = getStoredNotifyIds();
    const newIds = targetState
      ? [...new Set([...prevIds, String(event._id)])]
      : prevIds.filter(id => id !== String(event._id));
    saveNotifyIds(newIds);
    window.dispatchEvent(new Event('notify-ids-changed'));

    try {
      if (targetState) {
        // Subscribe
        await apiFetch('/api/notify-me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ eventId: event._id })
        });
      } else {
        // Unsubscribe
        await apiFetch(`/api/notify-me/${event._id}`, {
          method: 'DELETE',
          headers: { 'x-auth-token': token }
        });
      }
    } catch (err) {
      // Revert optimistic update on failure
      console.error('Notify toggle failed', err);
      setSubscribed(!targetState);
      saveNotifyIds(prevIds);
      window.dispatchEvent(new Event('notify-ids-changed'));
    } finally {
      setLoadingNotify(false);
    }
  };


  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const rawEventIdentifier = event._id || event.id || event.title || 'event';
  const encodedEventIdentifier = encodeURIComponent(rawEventIdentifier);
  const shareLink = `${baseUrl}/events?eventId=${encodedEventIdentifier}`;
  const encodedShareLink = encodeURIComponent(shareLink);
  const encodedShareText = encodeURIComponent(`${event.title} - ${shareLink}`);

  const copyTextToClipboard = async (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const handleCopyLink = async (e) => {
    e.stopPropagation();
    try {
      await copyTextToClipboard(shareLink);
      setCopyMessage('Link copied');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyMessage(''), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      setCopyMessage('Copy failed');
    }
  };

  const openShareUrl = (e, url) => {
    e.stopPropagation();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsShareOpen(false);
  };

  useEffect(() => {
    const handleGlobalClick = (event) => {
      if (isShareOpen && shareWrapperRef.current && !shareWrapperRef.current.contains(event.target)) {
        setIsShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [isShareOpen]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="event-card card h-100 p-0 border-0" style={{cursor: 'pointer'}} onClick={onClick}>
      <div className="card-body d-flex flex-column justify-content-between">
        <div>
          <div className="d-flex align-items-center mb-2 justify-content-between">
            <div className="d-flex align-items-center">
              <span className="event-badge me-2 text-capitalize">{event.category || event.type}</span>
              {(event.skillLevel || event.difficulty) && (
                <span className={`difficulty-badge ${(event.skillLevel || event.difficulty).toLowerCase()}`}>
                  {event.skillLevel || event.difficulty}
                </span>
              )}
            </div>
            <div className="d-flex align-items-center gap-2">
              <div className="event-share-wrapper" ref={shareWrapperRef}>
                <button
                  type="button"
                  className="btn btn-link p-0 border-0 event-share-button"
                  title="Share Event"
                  aria-label="Share this event"
                  aria-haspopup="menu"
                  aria-expanded={isShareOpen}
                  onClick={e => {
                    e.stopPropagation();
                    setIsShareOpen(prev => !prev);
                  }}
                >
                  <i className="bi bi-share" style={{fontSize:'1.4rem'}}></i>
                </button>
                {isShareOpen && (
                  <div className="event-share-menu" role="menu">
                    <button type="button" className="event-share-option" role="menuitem" onClick={handleCopyLink}>
                      <i className="bi bi-clipboard me-2"></i>
                      Copy Event Link
                    </button>
                    <button
                      type="button"
                      className="event-share-option"
                      role="menuitem"
                      onClick={e => openShareUrl(e, `https://api.whatsapp.com/send?text=${encodedShareText}`)}
                    >
                      <i className="bi bi-whatsapp me-2"></i>
                      Share via WhatsApp
                    </button>
                    <button
                      type="button"
                      className="event-share-option"
                      role="menuitem"
                      onClick={e => openShareUrl(e, `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareLink}`)}
                    >
                      <i className="bi bi-linkedin me-2"></i>
                      Share via LinkedIn
                    </button>
                    <button
                      type="button"
                      className="event-share-option"
                      role="menuitem"
                      onClick={e => openShareUrl(e, `https://twitter.com/intent/tweet?url=${encodedShareLink}&text=${encodedShareText}`)}
                    >
                      <i className="bi bi-twitter me-2"></i>
                      Share via Twitter
                    </button>
                    {copyMessage && <div className="event-share-confirmation">{copyMessage}</div>}
                  </div>
                )}
              </div>
              {showBookmark && (
                <button
                  className="btn btn-link p-0 border-0"
                  style={{boxShadow:'none'}}
                  title={isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
                  onClick={e => { e.stopPropagation(); onBookmark(event); }}
                >
                  <i className={isBookmarked ? 'bi bi-bookmark-fill text-primary' : 'bi bi-bookmark'} style={{fontSize:'1.4em'}}></i>
                </button>
              )}
            </div>
          </div>
          {/* Title — STRICT 2-line clamp, never grows */}
          <h5 className="card-title fw-bold mb-1" style={{
            color:'#3b5bfd',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.4em'
          }}>
            {event.title}
          </h5>

          {/* Description — STRICT 2-line clamp, never grows */}
          <p className="card-text mb-2 text-muted" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.8em',
            lineHeight: '1.4em',
            fontSize: '0.9rem'
          }}>{event.description}</p>

          {/* Info rows — EACH must truncate to single line */}
          <div className="event-meta-list mb-2">
            <div className="event-meta d-flex align-items-center mb-1">
              <i className="bi bi-geo-alt me-2 flex-shrink-0"></i>
              <span className="text-truncate">{event.location || 'Location TBA'}</span>
            </div>
            
            <div className="event-meta d-flex align-items-center mb-1">
              <i className="bi bi-calendar-event me-2 flex-shrink-0"></i>
              <span className="text-truncate">
                <strong>Event:&nbsp;</strong>
                {event.eventDate ? new Date(event.eventDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date TBA'}
              </span>
            </div>
            
            <div className="event-meta d-flex align-items-center mb-1">
              <i className="bi bi-clock me-2 flex-shrink-0"></i>
              <span className="text-truncate">
                <strong>Deadline:&nbsp;</strong>
                {event.deadline ? new Date(event.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date TBA'}
              </span>
            </div>

            {/* CRITICAL: only render Duration row if duration exists AND is short. Otherwise omit it entirely. */}
            {event.duration && event.duration.length < 30 && (
              <div className="event-meta d-flex align-items-center mb-1">
                <i className="bi bi-hourglass-split me-2 flex-shrink-0"></i>
                <span className="text-truncate"><strong>Duration:&nbsp;</strong>{event.duration}</span>
              </div>
            )}
            
            <div className="event-meta d-flex align-items-center mb-1">
              <i className="bi bi-laptop me-2 flex-shrink-0"></i>
              <span className="text-truncate text-capitalize">
                <strong>Mode:&nbsp;</strong>{event.mode || 'TBA'}
              </span>
            </div>
          </div>

          {/* Tags row — max 3 shown, rest collapsed into +N, single row, never wraps */}
          <div className="event-tags mb-2 d-flex align-items-center flex-nowrap overflow-hidden" style={{gap: '0.3rem', minHeight: '1.8em'}}>
            {(event.tags || []).slice(0, 3).map((tag, idx) => (
              <span key={idx} className="event-tag flex-shrink-0 text-truncate" style={{maxWidth: '100px'}}>
                {tag}
              </span>
            ))}
            {(event.tags || []).length > 3 && (
              <span className="event-tag flex-shrink-0">
                +{(event.tags || []).length - 3}
              </span>
            )}
            {!(event.tags && event.tags.length > 0) && (
              <span style={{color:'#94a3b8', fontStyle:'italic', fontSize:'0.82rem'}}>No tags</span>
            )}
          </div>


        </div>
        
        {showActions && (
          <div className="d-flex gap-2">
            <button
              className="btn flex-fill"
              onClick={toggleNotify}
              disabled={loadingNotify}
              style={{
                fontWeight: 700,
                fontSize: '0.92rem',
                borderRadius: '0.8rem',
                transition: 'all 0.2s',
                background: subscribed ? '#4f46e5' : 'transparent',
                color: subscribed ? '#fff' : '#4f46e5',
                border: subscribed ? '1.5px solid #4f46e5' : '1.5px solid #c7d2fe',
              }}
            >
              {loadingNotify
                ? <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>...</>
                : subscribed
                  ? <><i className="bi bi-bell-fill me-1"></i>Notifying ✓</>
                  : <><i className="bi bi-bell me-1"></i>Notify Me</>
              }
            </button>
            <a
              href={event.applyLink || event.link || '#'}
              className="btn btn-primary flex-fill"
              target="_blank"
              rel="noopener noreferrer"
              style={{fontWeight:600, fontSize:'0.9rem'}}
              onClick={e => e.stopPropagation()}
            >
              Apply Now <i className="bi bi-box-arrow-up-right ms-1"></i>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
