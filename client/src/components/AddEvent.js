import React, { useState } from 'react';
import axios from 'axios';

const AddEvent = ({ onEventAdded }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    organizerName: '',
    location: '',
    date: '',
  });

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/events/add', form);
      setForm({ title: '', description: '', organizerName: '', location: '', date: '' });
      if (onEventAdded) onEventAdded();
    } catch (err) {
      alert('Error adding event');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add Event</h3>
      <input name="title" value={form.title} onChange={handleChange} placeholder="Title" required /><br />
      <input name="description" value={form.description} onChange={handleChange} placeholder="Description" required /><br />
      <input name="organizerName" value={form.organizerName} onChange={handleChange} placeholder="Organizer Name" required /><br />
      <input name="location" value={form.location} onChange={handleChange} placeholder="Location" required /><br />
      <input name="date" type="datetime-local" value={form.date} onChange={handleChange} required /><br />
      <button type="submit">Add Event</button>
    </form>
  );
};

export default AddEvent;
