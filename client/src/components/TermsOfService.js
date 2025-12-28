import React from 'react';

const TermsOfService = () => (
  <div className="container py-4" style={{maxWidth: 700}}>
    <h2 style={{fontWeight:800, fontSize:'2rem', marginBottom:'1.2rem'}}>Terms of Service</h2>
    <div className="card p-4">
      <div style={{whiteSpace:'pre-line', fontSize:'1.13rem', color:'#22223b'}}>
        <b>Last updated: January 1, 2025</b>{'\n'}
        Welcome to Clockdin. By using our app, you agree to these terms.\n
        <b>Use of Service</b>\nYou agree to use Clockdin only for lawful purposes, and not to disrupt or attempt to gain unauthorized access to the service.\n
        <b>Accounts</b>\nYou are responsible for maintaining the confidentiality of your account and for all activities under it.\n
        <b>Content</b>\nYou retain ownership of content you add. You grant Clockdin a license to host and display it as needed to operate the service.\n
        <b>Prohibited Activities</b>\nPosting unlawful or harmful content.\nAttempting to reverse engineer or disrupt the service.\nMisusing notifications or spam.\n
        <b>Termination</b>\nWe may suspend or terminate access for violations of these terms or for security reasons.\n
        <b>Disclaimers & Liability</b>\nClockdin is provided “as is” without warranties. To the maximum extent permitted by law, we are not liable for indirect or consequential damages.\n
        <b>Changes to Terms</b>\nWe may update these terms. Continued use after changes constitutes acceptance.\n
        <b>Contact</b>\nQuestions? Email clockdinapp@gmail.com.
      </div>
    </div>
  </div>
);

export default TermsOfService;
