import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I am Clockdin AI. Ask me anything.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(msgs => [...msgs, { from: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(msgs => [...msgs, { from: 'bot', text: data.reply }]);
    } catch {
      setMessages(msgs => [...msgs, { from: 'bot', text: 'Sorry, I could not answer that.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="chatbot-fab" onClick={() => setOpen(o => !o)}>
        <i className="bi bi-chat-dots" style={{fontSize:'1.5rem'}}></i>
      </button>
      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>Clockdin AI Chatbot</span>
            <button className="chatbot-close" onClick={() => setOpen(false)}>&times;</button>
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
