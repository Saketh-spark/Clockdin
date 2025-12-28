import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  { label: 'Personal', icon: 'bi-person' },
  { label: 'Academic', icon: 'bi-book' },
  { label: 'Sports', icon: 'bi-trophy' },
  { label: 'Other', icon: 'bi-three-dots' },
];

const reminders = [
  'No reminder',
  'On time',
  '5 minutes before',
  '10 minutes before',
  '1 hour before',
  '1 day before',
];

const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return { dateLabel: 'Date TBD', timeLabel: timeStr || '' };

  const hasIsoTime = dateStr.includes('T');
  const dateOnly = hasIsoTime ? dateStr.split('T')[0] : dateStr;
  const isoTimePart = hasIsoTime ? dateStr.split('T')[1]?.replace('Z', '').trim() : '';
  const timeCandidate = timeStr || isoTimePart || '';

  let dateLabel = dateOnly;
  let timeLabel = timeCandidate;

  // Build a Date from dateOnly + timeCandidate when possible
  const buildDate = () => {
    if (dateOnly && timeCandidate) return new Date(`${dateOnly}T${timeCandidate}`);
    return new Date(dateOnly);
  };

  const dt = buildDate();
  if (!isNaN(dt.getTime())) {
    dateLabel = dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    timeLabel = timeCandidate
      ? dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : '';
  }

  return { dateLabel, timeLabel };
};

const MyEvents = () => {
  const [events, setEvents] = useState([]);
  // Fetch events from backend on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
  const token = localStorage.getItem('clockdin_token');
        const res = await axios.get('/api/users/myevents', {
          headers: { 'x-auth-token': token }
        });
        setEvents(res.data);
      } catch (err) {
        setEvents([]);
      }
    };
    fetchEvents();
  }, []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);

  const openModal = () => {
    setForm(initialForm);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
  const token = localStorage.getItem('clockdin_token');
      // Convert date to ISO format if not already
      let eventDate = form.date;
      if (eventDate && !/\d{4}-\d{2}-\d{2}/.test(eventDate)) {
        // Try to parse DD-MM-YYYY or similar
        const parts = eventDate.split('-');
        if (parts.length === 3) {
          eventDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const res = await axios.post('/api/users/myevents', {
        title: form.title,
        description: form.description,
        date: eventDate,
        time: form.time,
        location: form.location,
        category: form.category,
        reminder: form.reminder
      }, {
        headers: { 'x-auth-token': token }
      });
      setEvents(res.data);
      // If reminder is set (not 'No reminder'), create a notification
      if (form.reminder && form.reminder !== 'No reminder') {
        await axios.post('/api/users/notifications', {
          message: `Reminder set for event: ${form.title} (${form.reminder})`,
          date: new Date(),
          type: 'reminder',
          title: form.title
        }, {
          headers: { 'x-auth-token': token }
        });
      }
      setShowModal(false);
    } catch (err) {
      alert('Failed to add event.');
    }
  };
  // Clear all events
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all your events and notifications?')) return;
    try {
  const token = localStorage.getItem('clockdin_token');
      // Delete all events one by one (API does not support bulk delete)
      for (let i = events.length - 1; i >= 0; i--) {
        await axios.delete(`/api/users/myevents/${i}`, {
          headers: { 'x-auth-token': token }
        });
      }
      setEvents([]);
      // Clear all notifications (API does not support bulk delete, so mark all as read and clear array)
      await axios.post('/api/users/notifications/read', {}, {
        headers: { 'x-auth-token': token }
      });
      // Optionally, you can add a backend route to delete all notifications if needed
    } catch (err) {
      alert('Failed to clear events and notifications.');
    }
  };

  // Add this delete handler
  const handleDeleteEvent = async (idx) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const token = localStorage.getItem('clockdin_token');
      await axios.delete(`/api/users/myevents/${idx}`, {
        headers: { 'x-auth-token': token }
      });
      setEvents(prev => prev.filter((_, i) => i !== idx));
    } catch (err) {
      alert('Failed to delete event.');
    }
  };

  // Filtered events (search/category)
  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.title.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'All Categories' || ev.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 style={{fontWeight:800, fontSize:'2.3rem', color:'#22223b'}}>My Personal Events</h1>
          <div style={{color:'#64748b', fontSize:'1.1rem'}}>Manage your personal schedule, deadlines, and important dates</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary px-4 py-2" style={{fontWeight:600, fontSize:'1.1rem'}} onClick={openModal}>
            <i className="bi bi-plus-lg me-2"></i>Add Event
          </button>
          <button className="btn btn-danger px-4 py-2" style={{fontWeight:600, fontSize:'1.1rem'}} onClick={handleClearAll} disabled={events.length === 0}>
            <i className="bi bi-trash me-2"></i>Clear All
          </button>
        </div>
      </div>
      <div className="d-flex mb-3 gap-2">
        <input
          className="form-control"
          placeholder="Search your events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{fontSize:'1.08rem',borderRadius:'0.7rem'}}
        />
        <select className="form-select" value={category} onChange={e => setCategory(e.target.value)} style={{fontSize:'1.08rem',borderRadius:'0.7rem'}}>
          <option>All Categories</option>
          {categories.map(cat => <option key={cat.label}>{cat.label}</option>)}
        </select>
      </div>
      {filteredEvents.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{height:'340px',background:'#f8fafc',borderRadius:'1.2rem',border:'1px solid #e5e7eb'}}>
          <i className="bi bi-calendar" style={{fontSize:'4.5rem',color:'#cbd5e1',marginBottom:18}}></i>
          <h3 style={{fontWeight:700,marginBottom:6}}>No events yet</h3>
          <div style={{color:'#64748b',marginBottom:18,fontSize:'1.13rem'}}>Start by adding your first personal event to stay organized.</div>
          <button className="btn btn-primary px-4 py-2 fw-bold" style={{fontSize:'1.1rem',borderRadius:'0.7rem'}} onClick={openModal}><i className="bi bi-plus-lg me-1"></i> Add Your First Event</button>
        </div>
      ) : (
        <div className="row">
          {filteredEvents.map((ev, idx) => (
            <div className="col-md-4 mb-4" key={idx}>
              <div
                className="card h-100 shadow event-modern-card"
                style={{
                  borderRadius: '1.3rem',
                  border: '1.5px solid #e5e7eb',
                  boxShadow: '0 6px 32px 0 rgba(59,91,253,0.08)',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                  background: 'linear-gradient(120deg,#f8fafc 60%,#e0e7ff 100%)',
                  cursor: 'pointer',
                  position: 'relative' // ensure absolute child positions correctly
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                {/* Dustbin / delete button (top-right) */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteEvent(idx); }}
                  title="Delete event"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    borderRadius: 8,
                    background: '#fff',
                    border: '1px solid #fde2e2',
                    color: '#ef4444',
                    padding: '6px 8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    zIndex: 5,
                  }}
                >
                  <i className="bi bi-trash"></i>
                </button>

                <div className="card-body" style={{padding:'1.5rem'}}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-calendar2-week" style={{fontSize:'1.7rem',color:'#6366f1'}}></i>
                    <h5 className="card-title fw-bold mb-0" style={{color:'#22223b',fontSize:'1.25rem'}}>{ev.title}</h5>
                  </div>
                  <div className="mb-2 d-flex align-items-center gap-2" style={{color:'#64748b',fontSize:'1.08rem'}}>
                    <i className="bi bi-clock-history"></i>
                    {(() => {
                      const { dateLabel, timeLabel } = formatDateTime(ev.date, ev.time);
                      return (
                        <span>
                          {dateLabel}{timeLabel ? ` at ${timeLabel}` : ''}
                        </span>
                      );
                    })()}
                  </div>
                  {ev.location && (
                    <div className="mb-2 d-flex align-items-center gap-2" style={{color:'#64748b',fontSize:'1.08rem'}}>
                      <i className="bi bi-geo-alt"></i>
                      <span>{ev.location}</span>
                    </div>
                  )}
                  <div className="mb-2 d-flex align-items-center gap-2">
                    <span className="badge" style={{background:'#e0e7ff',color:'#3b5bfd',fontWeight:600,borderRadius:'0.7rem',fontSize:'1.01rem',padding:'0.5em 1em'}}>
                      <i className="bi bi-bookmark me-1"></i>{ev.category}
                    </span>
                    {ev.reminder && ev.reminder !== 'No reminder' && (
                      <span className="badge" style={{background:'#fef3c7',color:'#b45309',fontWeight:600,borderRadius:'0.7rem',fontSize:'1.01rem',padding:'0.5em 1em'}}>
                        <i className="bi bi-bell me-1"></i>{ev.reminder}
                      </span>
                    )}
                  </div>
                  <p className="card-text mt-2" style={{color:'#334155',fontSize:'1.09rem',minHeight:48}}>{ev.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Add Event */}
      {showModal && (
        <div className="modal fade show" style={{display:'block', background:'rgba(0,0,0,0.18)'}} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{borderRadius:'1.2rem', padding:'1.5rem 1.5rem 1rem 1.5rem'}}>
              <button type="button" className="btn-close ms-auto" aria-label="Close" onClick={closeModal}></button>
              <h2 style={{fontWeight:700, fontSize:'1.5rem', color:'#22223b'}}>Add New Event</h2>
              <div style={{color:'#64748b', fontSize:'1.05rem', marginBottom:'1rem'}}>Create a personal event to track important dates and deadlines.</div>
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="form-label">Event Title *</label>
                  <input type="text" className="form-control" name="title" placeholder="e.g., Assignment Deadline, Cricket Match" value={form.title} onChange={handleChange} required />
                </div>
                <div className="mb-2">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" name="description" placeholder="Add more details about your event..." value={form.description} onChange={handleChange} />
                </div>
                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-control" name="date" value={form.date} onChange={handleChange} required />
                  </div>
                  <div className="col">
                    <label className="form-label">Time *</label>
                    <input type="time" className="form-control" name="time" value={form.time} onChange={handleChange} required />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label">Category</label>
                  <select className="form-select" name="category" value={form.category} onChange={handleChange}>
                    {categories.map(cat => (
                      <option key={cat.label} value={cat.label}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Location (Optional)</label>
                  <input type="text" className="form-control" name="location" placeholder="e.g., Library, Sports Ground, Online" value={form.location} onChange={handleChange} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Reminder</label>
                  <select className="form-select" name="reminder" value={form.reminder} onChange={handleChange}>
                    {reminders.map(rem => (
                      <option key={rem} value={rem}>{rem}</option>
                    ))}
                  </select>
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Event</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEvents;
