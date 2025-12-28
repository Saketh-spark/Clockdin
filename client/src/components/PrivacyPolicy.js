import React from 'react';

const PrivacyPolicy = () => (
  <div className="container py-4" style={{maxWidth: 700}}>
    <h2 style={{fontWeight:800, fontSize:'2rem', marginBottom:'1.2rem'}}>Privacy Policy</h2>
    <div className="card p-4">
      <div style={{whiteSpace:'pre-line', fontSize:'1.13rem', color:'#22223b'}}>
        <b>Effective date: January 1, 2025</b>{'\n'}
        Clockdin respects your privacy. This policy explains what information we collect, how we use it, and your choices.\n
        <b>Information We Collect</b>\nAccount details you provide (name, email).\nContent you add (events, bookmarks, reminders).\nUsage data to improve features and performance.\n
        <b>How We Use Information</b>\nOperate and improve Clockdin’s services.\nSend optional notifications and service updates.\nProtect against fraud and abuse.\n
        <b>Data Sharing</b>\nWe do not sell your personal information. We may share data with service providers who help operate the app, subject to confidentiality.\n
        <b>Data Retention</b>\nWe retain data for as long as needed to provide the service. You may request deletion of your account data at any time.\n
        <b>Your Choices</b>\nUpdate notification preferences in the app.\nExport or delete your data by contacting support.\nControl cookies via your browser settings.\n
        <b>Children</b>\nClockdin is not intended for children under 13. If you believe a child provided data, contact us to remove it.\n
        <b>Changes</b>\nWe may update this policy. Material changes will be communicated in-app or by email.\n
        <b>Contact</b>\nQuestions? Email clockdinapp@gmail.com.
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
