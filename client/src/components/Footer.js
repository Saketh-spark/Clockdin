import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();
  const handleCategory = (cat) => {
    navigate('/events', { state: { category: cat } });
  };
  const handleNav = (path) => navigate(path);
  return (
    <footer style={{background:'#fff',borderTop:'1px solid #e5e7eb',marginTop:'3rem',padding:'2.5rem 0 1.2rem 0'}}>
    <div className="container d-flex flex-wrap justify-content-between align-items-start gap-5" style={{maxWidth:1200}}>
      <div style={{minWidth:260}}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <div style={{background:'#3b5bfd',borderRadius:'0.7rem',padding:7,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="bi bi-clock-history" style={{color:'#fff',fontSize:'1.3rem'}}></i>
          </div>
          <span style={{fontWeight:800,fontSize:'1.4rem',color:'#111827'}}>Clockdin</span>
        </div>
        <div style={{color:'#334155',fontSize:'1.08rem',maxWidth:340}}>
          Your ultimate platform for discovering and managing student events, hackathons, internships, and personal reminders all in one place.
        </div>
      </div>
      <div>
  <div style={{fontWeight:700,fontSize:'1.13rem',marginBottom:8}}>Events</div>
  <div><span style={{color:'#334155',textDecoration:'none',display:'block',marginBottom:4,cursor:'pointer'}} onClick={()=>handleCategory('Hackathon')}>Hackathons</span></div>
  <div><span style={{color:'#334155',textDecoration:'none',display:'block',marginBottom:4,cursor:'pointer'}} onClick={()=>handleCategory('Internship')}>Internships</span></div>
  <div><span style={{color:'#334155',textDecoration:'none',display:'block',marginBottom:4,cursor:'pointer'}} onClick={()=>handleCategory('Workshop')}>Workshops</span></div>
  <div><span style={{color:'#334155',textDecoration:'none',display:'block',marginBottom:4,cursor:'pointer'}} onClick={()=>handleCategory('Student Competition')}>Competitions</span></div>
  <div><span style={{color:'#334155',textDecoration:'none',display:'block',marginBottom:4,cursor:'pointer'}} onClick={()=>handleCategory('Seminar')}>Seminars</span></div>
      </div>
      <div>
  <div style={{fontWeight:700,fontSize:'1.13rem',marginBottom:8}}>Support</div>
  <div><span style={{color:'#334155',textDecoration:'none',display:'block',marginBottom:4,cursor:'pointer'}} onClick={()=>handleNav('/help-center')}>Help Center</span></div>
  <div><span style={{color:'#334155',textDecoration:'none',display:'block',marginBottom:4,cursor:'pointer'}} onClick={()=>handleNav('/contact-us')}>Contact Us</span></div>
  <div><span style={{color:'#334155',textDecoration:'none',display:'block',marginBottom:4,cursor:'pointer'}} onClick={()=>handleNav('/privacy-policy')}>Privacy Policy</span></div>
  <div><span style={{color:'#334155',textDecoration:'none',display:'block',marginBottom:4,cursor:'pointer'}} onClick={()=>handleNav('/terms-of-service')}>Terms of Service</span></div>
      </div>
    </div>
    <hr style={{margin:'2rem 0 1rem 0',borderColor:'#e5e7eb'}} />
    <div className="text-center" style={{color:'#334155',fontSize:'1.08rem'}}>
      © 2025 Clockdin. All rights reserved.
    </div>
    </footer>
  );
};

export default Footer;
