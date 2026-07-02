import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import { apiFetch } from '../utils/api';

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I am Clockdin AI. Ask me anything.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(msgs => [...msgs, { from: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      if (!res.ok) throw new Error('Chatbot request failed');
      const data = await res.json();
      const replyText = data?.reply || 'Sorry, I could not answer that.';
      setMessages(msgs => [...msgs, { from: 'bot', text: replyText }]);
    } catch {
      setMessages(msgs => [...msgs, { from: 'bot', text: 'Sorry, I could not answer that. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setOpen(o => !o)}
        aria-label="Open chat assistant"
        title="Chat with Clockdin AI"
      >
        <i className="bi bi-chat-dots" style={{fontSize:'1.5rem'}}></i>
      </button>
      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>Clockdin AI Chatbot</span>
            <button type="button" className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close chat">&times;</button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg chatbot-msg-${msg.from}`}>{msg.text}</div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form className="chatbot-input-row" onSubmit={sendMessage}>
            <input
              className="chatbot-input"
              type="text"
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={loading}
            />
            <button className="chatbot-send" type="submit" disabled={loading || !input.trim()}>
              <i className="bi bi-send"></i>
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
