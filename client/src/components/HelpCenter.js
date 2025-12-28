
import { useState } from 'react';

const faqs = [
  {
    q: 'How do I bookmark an event?',
    a: 'Click the bookmark icon on any event card to save it to your Bookmarks page for quick access later.'
  },
  {
    q: 'How do notifications work?',
    a: 'You’ll receive notifications for upcoming deadlines, reminders you set, and important updates. Check the Notifications page to view and manage them.'
  },
  {
    q: 'How do I add my own events?',
    a: 'Go to the My Events page and click “Add Event” to create your own reminders and deadlines.'
  },
  {
    q: 'Can I edit or delete events later?',
    a: 'Yes, you can edit or delete your personal events from the My Events page at any time.'
  },
  {
    q: 'How do I contact support?',
    a: 'Use the Contact Us page or email us at clockdinapp@gmail.com for help.'
  },
];

const HelpCenter = () => {
  const [openIdx, setOpenIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState(faqs);

  const handleSearch = (e) => {
    e.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term) {
      setFiltered(faqs);
      setOpenIdx(0);
      return;
    }
    const results = faqs.filter(faq =>
      faq.q.toLowerCase().includes(term) || faq.a.toLowerCase().includes(term)
    );
    setFiltered(results);
    setOpenIdx(results.length > 0 ? 0 : -1);
  };

  return (
    <div className="container py-4" style={{maxWidth: 700}}>
      <h1 style={{fontWeight:800, fontSize:'2.2rem', marginBottom:'1.2rem'}}>Help Center</h1>
      <div style={{color:'#475569', fontSize:'1.13rem', marginBottom:'1.5rem'}}>
        Find quick answers to common questions. If you can’t find what you’re looking for, contact us and we’ll help you out.
      </div>
      <form className="mb-4" style={{display:'flex',gap:8,maxWidth:500}} onSubmit={handleSearch}>
        <input
          className="form-control"
          placeholder="Search FAQs (e.g. notifications, bookmarks)"
          style={{maxWidth:400, display:'inline-block'}}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>
      <div>
        {filtered.length === 0 ? (
          <div style={{color:'#64748b',fontSize:'1.13rem'}}>No FAQs found for your search.</div>
        ) : (
          filtered.map((faq, idx) => {
            // Find the index in the original faqs array for openIdx logic
            const origIdx = faqs.findIndex(f => f.q === faq.q);
            return (
              <div key={faq.q} className="mb-2" style={{border:'1px solid #e5e7eb', borderRadius:'0.7rem', background:'#fff'}}>
                <button
                  className="w-100 text-start p-3"
                  style={{background:'none', border:'none', fontWeight:700, fontSize:'1.13rem', color:'#22223b', outline:'none', cursor:'pointer'}}
                  onClick={() => setOpenIdx(openIdx === origIdx ? -1 : origIdx)}
                >
                  {faq.q}
                  <span style={{float:'right', fontWeight:400}}>{openIdx === origIdx ? '-' : '+'}</span>
                </button>
                {openIdx === origIdx && (
                  <div className="px-3 pb-3" style={{color:'#475569', fontSize:'1.08rem'}}>{faq.a}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HelpCenter;
