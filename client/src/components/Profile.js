import React, { useState, useEffect, useRef } from 'react';
import { apiAxios } from '../utils/api';
import '../Events.css';
import { getBookmarkStorageKeys } from '../utils/bookmarkStorage';

const glassCard = {
  background: 'rgba(255,255,255,0.75)',
  borderRadius: '1.5rem',
  border: '1.5px solid #e5e7eb',
  boxShadow: '0 8px 32px rgba(80,80,120,0.10)',
  backdropFilter: 'blur(8px)',
};

const defaultProfile = {
  name: 'Student User',
  email: '', // User email will be filled dynamically or left blank
  phone: '',
  location: '',
  bio: '',
  avatar: 'https://ui-avatars.com/api/?name=Student+User&background=3b5bfd&color=fff&size=128',
  college: '',
  major: '',
  gradYear: '',
  website: '',
  github: '',
  linkedin: '',
  twitter: '',
  interests: '',
  skills: '',
  joined: '',
};

const PROFILE_CACHE_KEY = () => `clockdin_profile_cache_${localStorage.getItem('clockdin_token')?.slice(-8) || 'guest'}`;

const getInitialProfile = () => {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY());
    if (cached) return JSON.parse(cached);
  } catch (_) {}
  return defaultProfile;
};

const Profile = () => {
  const [tab, setTab] = useState('profile');
  const [edit, setEdit] = useState(false);
  const [profile, setProfile] = useState(getInitialProfile);
  const [form, setForm] = useState(getInitialProfile);
  const avatarInputRef = useRef(null);

  // stats state
  const [bookmarkedCount, setBookmarkedCount] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY());
      if (cached) {
        const p = JSON.parse(cached);
        return p._cachedBookmarkCount || 0;
      }
    } catch (_) {}
    return 0;
  });
  const [personalCount, setPersonalCount] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY());
      if (cached) {
        const p = JSON.parse(cached);
        return p._cachedPersonalCount || 0;
      }
    } catch (_) {}
    return 0;
  });
  const [memberSinceDays, setMemberSinceDays] = useState(() => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY());
      if (cached) {
        const p = JSON.parse(cached);
        return p._cachedMemberSince ?? 'N/A';
      }
    } catch (_) {}
    return 'N/A';
  });

  const getLocalBookmarkCount = () => {
    const { idsKey, dataKey } = getBookmarkStorageKeys();
    const ids = JSON.parse(localStorage.getItem(idsKey) || '[]');
    const items = JSON.parse(localStorage.getItem(dataKey) || '[]');
    return Math.max(ids.length, items.length);
  };

  // Fetch profile from backend on mount — cache-first for instant load
  useEffect(() => {
    const fetchProfile = async () => {
      // Show cached data immediately (already set in useState initializer)
      // Now fetch fresh data silently in background
      try {
        const token = localStorage.getItem('clockdin_token');
        const res = await apiAxios.get('/api/users/me', {
          headers: { 'x-auth-token': token }
        });
        if (res.data) {
          const profilePayload = res.data.profile || {};
          const mergedProfile = {
            ...defaultProfile,
            ...profilePayload,
            avatar: res.data.avatar || defaultProfile.avatar,
            name: res.data.name,
            email: res.data.email,
          };
          // bookmarked count (server first, fallback to localStorage)
          const serverBookmarks = Array.isArray(res.data.bookmarks) ? res.data.bookmarks.length : 0;
          const fallbackBookmarks = getLocalBookmarkCount();
          const bCount = serverBookmarks || fallbackBookmarks;
          // personal events count
          const myEventsCount = Array.isArray(res.data.myEvents) ? res.data.myEvents.length : 0;
          // member since -> prefer explicit joined/createdAt, otherwise derive from _id
          let createdAt = null;
          if (res.data.joined) createdAt = new Date(res.data.joined);
          else if (res.data.createdAt) createdAt = new Date(res.data.createdAt);
          else if (res.data._id) {
            // ObjectId timestamp is first 8 hex chars
            try {
              const ts = parseInt(res.data._id.substring(0, 8), 16) * 1000;
              createdAt = new Date(ts);
            } catch (e) { createdAt = null; }
          }
          let days = 'N/A';
          if (createdAt && !isNaN(createdAt.getTime())) {
            days = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          }

          setProfile(mergedProfile);
          setForm({ ...mergedProfile });
          setBookmarkedCount(bCount);
          setPersonalCount(myEventsCount);
          setMemberSinceDays(days);

          // Persist to cache for next visit
          try {
            localStorage.setItem(PROFILE_CACHE_KEY(), JSON.stringify({
              ...mergedProfile,
              _cachedBookmarkCount: bCount,
              _cachedPersonalCount: myEventsCount,
              _cachedMemberSince: days,
            }));
          } catch (_) {}
        }
      } catch (err) {
        // Keep showing cached data on error; only override if nothing cached
        const cached = localStorage.getItem(PROFILE_CACHE_KEY());
        if (!cached) {
          setProfile(defaultProfile);
          setForm(defaultProfile);
          setBookmarkedCount(getLocalBookmarkCount());
          setPersonalCount(0);
          setMemberSinceDays('N/A');
        }
      }
    };
    fetchProfile();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const refresh = () => {
      setBookmarkedCount(getLocalBookmarkCount());
    };

    const onStorage = (e) => {
      if (!e.key || e.key.includes('bookmarkedEvents') || e.key === 'clockdin_user') {
        refresh();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('bookmarks-changed', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('bookmarks-changed', refresh);
    };
  }, []);
  const [settings, setSettings] = useState({
    email: true,
    reminders: true,
    digest: false,
    privacy: false,
    language: 'English',
  });

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleAvatarUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({ ...prev, avatar: reader.result || prev.avatar }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const startEdit = () => {
    setForm({ ...profile });
    setEdit(true);
  };

  const handleSave = async () => {
    try {
  const token = localStorage.getItem('clockdin_token');
      await apiAxios.put('/api/users/profile', form, {
        headers: { 'x-auth-token': token }
      });
      setProfile({ ...form });
      setForm({ ...form });
      setEdit(false);
    } catch (err) {
      alert('Failed to update profile.');
    }
  };
  const handleSettings = (key, value) => setSettings(s => ({...s, [key]: value ?? !s[key]}));

  const buildExternalLink = (value) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  };

  const renderSocialField = ({ name, label, icon }) => {
    const rawValue = edit ? form[name] : profile[name];
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    const hasValue = Boolean(value);

    return (
      <div className="col-md-6">
        <label className="form-label"><i className={`bi ${icon} me-1`}></i>{label}</label>
        {edit ? (
          <input
            className="form-control"
            name={name}
            value={form[name]}
            onChange={handleChange}
            disabled={!edit}
          />
        ) : hasValue ? (
          <a
            className="d-flex align-items-center justify-content-between px-3 py-2 border rounded text-decoration-none"
            href={buildExternalLink(value)}
            target="_blank"
            rel="noreferrer"
            style={{ fontWeight: 600, color: '#2563eb' }}
          >
            <span className="text-truncate" style={{ maxWidth: '80%' }}>{value}</span>
            <i className="bi bi-box-arrow-up-right"></i>
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-between"
            style={{ borderRadius: '0.8rem', fontWeight: 600 }}
            onClick={startEdit}
          >
            <span className="d-flex align-items-center gap-2">
              <i className="bi bi-plus-circle"></i>Add your {label}
            </span>
            <i className="bi bi-arrow-right-short"></i>
          </button>
        )}
      </div>
    );
  };

  // Stats (dynamic)
  const stats = [
    { icon: 'bi-bookmark-check', label: 'Bookmarked Events', value: bookmarkedCount },
    { icon: 'bi-calendar', label: 'Personal Events', value: personalCount },
    { icon: 'bi-clock-history', label: 'Member Since', value: typeof memberSinceDays === 'number' ? `${memberSinceDays} days` : 'N/A' },
  ];

  return (
    <div className="container-fluid py-4" style={{minHeight:'100vh', background:'linear-gradient(120deg,#f8fafc 60%,#e0e7ff 100%)'}}>
      <div className="text-center mb-4">
        <h1 style={{fontWeight:900, fontSize:'2.7rem', color:'#22223b', letterSpacing:'-1px'}}>Profile</h1>
        <div style={{color:'#64748b', fontSize:'1.18rem'}}>Manage your personal information and preferences</div>
      </div>
      <div className="d-flex justify-content-center gap-3 mb-4">
        <button className={`btn ${tab==='profile'?'btn-glass-active':'btn-glass'}`} style={{minWidth:160}} onClick={()=>setTab('profile')}><i className="bi bi-person-circle me-1"></i> Profile</button>
        <button className={`btn ${tab==='stats'?'btn-glass-active':'btn-glass'}`} style={{minWidth:160}} onClick={()=>setTab('stats')}><i className="bi bi-bar-chart-line me-1"></i> Statistics</button>
        <button className={`btn ${tab==='settings'?'btn-glass-active':'btn-glass'}`} style={{minWidth:160}} onClick={()=>setTab('settings')}><i className="bi bi-gear-wide-connected me-1"></i> Settings</button>
      </div>
      {tab === 'profile' && (
        <div className="p-4 mb-4" style={{...glassCard, position:'relative'}}>
          <div className="d-flex justify-content-end mb-3">
            {!edit ? (
              <button
                className="btn btn-outline-primary"
                style={{ borderRadius: '1.2rem', fontWeight: 600 }}
                onClick={startEdit}
              >
                <i className="bi bi-pencil-square me-2"></i>Edit Profile
              </button>
            ) : (
              <div style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.95rem' }}>
                You are editing your details
              </div>
            )}
          </div>
          <div className="d-flex justify-content-center align-items-center mb-4 gap-4 flex-wrap">
            <div style={{position:'relative', width:120, height:120, minWidth:120}}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
              <img
                src={edit ? form.avatar : profile.avatar}
                alt="avatar"
                style={{ width:120, height:120, borderRadius:'50%', border:'4px solid #6366f1', boxShadow:'0 2px 16px #6366f133', objectFit:'cover' }}
              />
              <span
                style={{ position:'absolute', bottom:8, right:8, background:'#fff', borderRadius:'50%', padding:6, boxShadow:'0 2px 8px #6366f133', border:'1.5px solid #e5e7eb', cursor: edit ? 'pointer' : 'not-allowed' }}
                title={edit ? 'Change Avatar' : 'Enter edit mode to change avatar'}
                onClick={() => edit && avatarInputRef.current?.click()}
              >
                <i className="bi bi-camera" style={{ color:'#6366f1', fontSize:'1.2rem' }}></i>
              </span>
            </div>
            <div>
              <h2 style={{fontWeight:800, fontSize:'2rem', color:'#22223b', marginBottom:4, letterSpacing:'-0.5px'}}><i className="bi bi-person-badge me-2 text-primary"></i>{profile.name || 'Student User'}</h2>
              <div style={{color:'#6366f1', fontWeight:600, fontSize:'1.1rem'}}><i className="bi bi-envelope-at me-2"></i>{profile.email || 'email@example.com'}</div>
              <div style={{color:'#64748b', fontSize:'1.01rem', marginTop:2}}><i className="bi bi-geo-alt me-2"></i>{profile.location || 'City, Country'}</div>
            </div>
          </div>
          <hr style={{margin:'2rem 0', borderTop:'1.5px solid #e5e7eb'}} />
          <h3 className="mb-4" style={{fontWeight:800, fontSize:'1.4rem', color:'#22223b'}}><i className="bi bi-person-lines-fill me-2 text-primary"></i>Personal Information</h3>
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <label className="form-label"><i className="bi bi-person me-1"></i>Full Name</label>
              <input className="form-control" name="name" value={edit ? form.name : profile.name} onChange={handleChange} disabled={!edit} placeholder="Student User" />
            </div>
            <div className="col-md-6">
              <label className="form-label"><i className="bi bi-envelope-at me-1"></i>Email</label>
              <input className="form-control" name="email" value={edit ? form.email : profile.email} onChange={handleChange} disabled={!edit} placeholder="email@example.com" />
            </div>
            <div className="col-md-6">
              <label className="form-label"><i className="bi bi-telephone me-1"></i>Phone</label>
              <input className="form-control" name="phone" value={edit ? form.phone : profile.phone} onChange={handleChange} disabled={!edit} placeholder="+1 (555) 123-4567" />
            </div>
            <div className="col-md-6">
              <label className="form-label"><i className="bi bi-geo-alt me-1"></i>Location</label>
              <input className="form-control" name="location" value={edit ? form.location : profile.location} onChange={handleChange} disabled={!edit} placeholder="City, Country" />
            </div>
            <div className="col-12">
              <label className="form-label"><i className="bi bi-chat-left-text me-1"></i>Bio</label>
              <textarea className="form-control" name="bio" value={edit ? form.bio : profile.bio} onChange={handleChange} disabled={!edit} placeholder="Tell us about yourself..." rows={2} />
            </div>
          </div>
          <h3 className="mb-3 mt-4" style={{fontWeight:800, fontSize:'1.3rem', color:'#22223b'}}><i className="bi bi-mortarboard-fill me-2 text-success"></i>Education</h3>
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <label className="form-label"><i className="bi bi-building me-1"></i>College/University</label>
              <input className="form-control" name="college" value={edit ? form.college : profile.college} onChange={handleChange} disabled={!edit} placeholder="e.g., MIT, Stanford University" />
            </div>
            <div className="col-md-6">
              <label className="form-label"><i className="bi bi-journal-code me-1"></i>Major/Field of Study</label>
              <input className="form-control" name="major" value={edit ? form.major : profile.major} onChange={handleChange} disabled={!edit} placeholder="e.g., Computer Science" />
            </div>
            <div className="col-md-6">
              <label className="form-label"><i className="bi bi-calendar2-event me-1"></i>Graduation Year</label>
              <input className="form-control" name="gradYear" value={edit ? form.gradYear : profile.gradYear} onChange={handleChange} disabled={!edit} placeholder="e.g., 2025" />
            </div>
          </div>
          <h3 className="mb-3 mt-4" style={{fontWeight:800, fontSize:'1.3rem', color:'#22223b'}}><i className="bi bi-globe2 me-2 text-info"></i>Social Links</h3>
          <div className="row g-4 mb-4">
            {renderSocialField({ name: 'website', label: 'Website', icon: 'bi-globe' })}
            {renderSocialField({ name: 'github', label: 'GitHub', icon: 'bi-github' })}
            {renderSocialField({ name: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin' })}
            {renderSocialField({ name: 'twitter', label: 'Twitter', icon: 'bi-twitter' })}
          </div>
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <h4 className="mb-2" style={{fontWeight:700, fontSize:'1.15rem', color:'#22223b'}}><i className="bi bi-bullseye me-2 text-danger"></i>Interests</h4>
              <input className="form-control" name="interests" value={edit ? form.interests : profile.interests} onChange={handleChange} disabled={!edit} placeholder="e.g., AI, Web Development, Sports" />
            </div>
            <div className="col-md-6">
              <h4 className="mb-2" style={{fontWeight:700, fontSize:'1.15rem', color:'#22223b'}}><i className="bi bi-award me-2 text-warning"></i>Skills</h4>
              <input className="form-control" name="skills" value={edit ? form.skills : profile.skills} onChange={handleChange} disabled={!edit} placeholder="e.g., React, Python, Leadership" />
            </div>
          </div>
          {edit && (
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-gradient px-4 py-2" style={{background:'linear-gradient(90deg,#6366f1,#3b82f6)',color:'#fff',fontWeight:600,borderRadius:'1.2rem',border:'none'}} onClick={handleSave}>Save</button>
              <button
                className="btn btn-outline-secondary px-4 py-2"
                style={{ borderRadius: '1.2rem' }}
                onClick={() => {
                  setForm({ ...profile });
                  setEdit(false);
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      {tab === 'stats' && (
        <div>
          <div className="row g-4 mb-4">
            {stats.map((s, idx) => (
              <div className="col-md-4" key={s.label}>
                <div className="p-4 text-center" style={{...glassCard, transition:'box-shadow 0.2s', cursor:'pointer', borderColor:'#e0e7ff'}}>
                  <i className={`bi ${s.icon}`} style={{fontSize:'2.2rem', color: idx===0?'#6366f1':idx===1?'#22c55e':'#0ea5e9'}}></i>
                  <div style={{fontWeight:700, fontSize:'1.3rem', color:'#22223b', marginTop:'0.5rem'}}>{s.value}</div>
                  <div className="text-muted">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4" style={{...glassCard}}>
            <h4 style={{fontWeight:800, fontSize:'1.2rem', color:'#22223b'}}><i className="bi bi-activity me-2 text-primary"></i>Activity Summary</h4>
            <div style={{color:'#495057', fontSize:'1.08rem', marginTop:'0.5rem'}}>
              You've been actively using Clockdin to manage your events and stay organized. Keep exploring new opportunities and building your skills!
            </div>
          </div>
        </div>
      )}
      {tab === 'settings' && (
        <div>
          <div className="p-4 mb-4" style={{...glassCard}}>
            <h3 className="mb-4" style={{fontWeight:800, fontSize:'1.4rem', color:'#22223b'}}><i className="bi bi-bell-fill me-2 text-warning"></i>Notifications</h3>
            <div className="row g-4 mb-4">
              <div className="col-md-6 d-flex align-items-center justify-content-between">
                <div>
                  <div style={{fontWeight:700}}><i className="bi bi-envelope-paper me-1 text-primary"></i>Email Notifications</div>
                  <div className="text-muted" style={{fontSize:'0.98rem'}}>Receive event reminders and updates via email</div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={settings.email} onChange={()=>handleSettings('email')} />
                </div>
              </div>
              <div className="col-md-6 d-flex align-items-center justify-content-between">
                <div>
                  <div style={{fontWeight:700}}><i className="bi bi-calendar2-week me-1 text-success"></i>Event Reminders</div>
                  <div className="text-muted" style={{fontSize:'0.98rem'}}>Get reminded about upcoming events and deadlines</div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={settings.reminders} onChange={()=>handleSettings('reminders')} />
                </div>
              </div>
              <div className="col-md-6 d-flex align-items-center justify-content-between">
                <div>
                  <div style={{fontWeight:700}}><i className="bi bi-newspaper me-1 text-info"></i>Weekly Digest</div>
                  <div className="text-muted" style={{fontSize:'0.98rem'}}>Weekly summary of new events and opportunities</div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={settings.digest} onChange={()=>handleSettings('digest')} />
                </div>
              </div>
            </div>
          </div>
          <div className="p-4" style={{...glassCard}}>
            <h3 className="mb-4" style={{fontWeight:800, fontSize:'1.4rem', color:'#22223b'}}><i className="bi bi-shield-lock-fill me-2 text-danger"></i>Privacy & Preferences</h3>
            <div className="row g-4 mb-4">
              <div className="col-md-6 d-flex align-items-center justify-content-between">
                <div>
                  <div style={{fontWeight:700}}><i className="bi bi-eye-slash me-1 text-secondary"></i>Privacy Mode</div>
                  <div className="text-muted" style={{fontSize:'0.98rem'}}>Make your profile and activity private</div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={settings.privacy} onChange={()=>handleSettings('privacy')} />
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label"><i className="bi bi-translate me-1 text-info"></i>Language</label>
                <select className="form-select" value={settings.language} onChange={e=>handleSettings('language', e.target.value)}>
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Telugu</option>
                  <option>Tamil</option>
                  <option>Kannada</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Custom styles for glassmorphism and tab buttons */}
      <style>{`
        .btn-glass {
          background: rgba(255,255,255,0.6);
          border: 1.5px solid #e5e7eb;
          border-radius: 1.2rem;
          color: #6366f1;
          font-weight: 600;
          box-shadow: 0 2px 8px #6366f122;
          transition: all 0.15s;
        }
        .btn-glass:hover, .btn-glass:focus {
          background: #e0e7ff;
          color: #22223b;
          border-color: #6366f1;
        }
        .btn-glass-active {
          background: linear-gradient(90deg,#6366f1,#3b82f6);
          color: #fff;
          border: none;
          font-weight: 700;
          box-shadow: 0 2px 12px #6366f144;
        }
      `}</style>
    </div>
  );
};

export default Profile;
