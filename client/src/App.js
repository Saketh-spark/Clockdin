import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from './components/Navbar';
import Events from './components/Events';
import MyEvents from './components/MyEvents';
import Bookmarks from './components/Bookmarks';
import Notifications from './components/Notifications';
import Profile from './components/Profile';
import Landing from './components/Landing';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import HelpCenter from './components/HelpCenter';
import ContactUs from './components/ContactUs';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';

function App() {
  const [signedIn, setSignedIn] = useState(() => {
    return localStorage.getItem('clockdin_signedin') === 'true';
  });

  const handleSignIn = () => {
    localStorage.setItem('clockdin_signedin', 'true');
    setSignedIn(true);
  };
  const handleSignOut = () => {
    localStorage.removeItem('clockdin_signedin');
    setSignedIn(false);
  };

  if (!signedIn) {
    return <Landing onSignIn={handleSignIn} />;
  }

  return (
    <Router>
      <div className="container-fluid" style={{minHeight:'80vh'}}>
        <Navbar onSignOut={handleSignOut} />
        <br />
        <Routes>
          <Route path="/events" element={<Events />} />
          <Route path="/my-events" element={<MyEvents />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/help-center" element={<HelpCenter />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
        </Routes>
      </div>
  <Footer />
  <Chatbot />
    </Router>
  );
}

export default App;
