import React from 'react';

const ContactUs = () => (
  <div className="container py-4" style={{maxWidth: 700}}>
    <h2 style={{fontWeight:800, fontSize:'2rem', marginBottom:'1.2rem'}}>Contact Us</h2>
    <div className="card mb-4 p-4">
      <div style={{fontWeight:700, fontSize:'1.18rem', marginBottom:8}}>We're here to help. Reach out with questions, feedback, or partnership inquiries.</div>
      <div style={{marginBottom:8}}>
        <b>Email:</b> <a href="mailto:clockdinapp@gmail.com">clockdinapp@gmail.com</a>
      </div>
      <div><b>Hours:</b> Mon–Fri, 9am–5pm PT</div>
    </div>
    <div className="card p-4">
      <h4 style={{fontWeight:700, fontSize:'1.15rem', marginBottom:12}}>Send us a message</h4>
      <form>
        <div className="row mb-2">
          <div className="col">
            <input className="form-control" placeholder="Full name" />
          </div>
          <div className="col">
            <input className="form-control" placeholder="Email address" />
          </div>
        </div>
        <input className="form-control mb-2" placeholder="Subject" />
        <textarea className="form-control mb-3" placeholder="How can we help?" rows={4} />
        <button className="btn btn-primary me-2" type="button">Email Support</button>
        <button className="btn btn-outline-secondary" type="button">View Help Docs</button>
      </form>
    </div>
  </div>
);

export default ContactUs;
