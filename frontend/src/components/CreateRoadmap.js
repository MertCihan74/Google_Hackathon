import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateRoadmap.css';

const CreateRoadmap = () => {
  const [goal, setGoal] = useState('');
  const [days, setDays] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goal, days: parseInt(days) })
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error('Yol haritası oluşturulurken bir hata oluştu');
      }

      const data = await response.json();
      navigate(`/roadmap/${data.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="create-roadmap-container">
      <form className="create-roadmap-form" onSubmit={handleSubmit}>
        <h2>Yol Haritası Oluştur</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label htmlFor="goal">Hedefiniz:</label>
          <input
            type="text"
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
            placeholder="Örneğin: Python öğrenmek"
          />
        </div>
        <div className="form-group">
          <label htmlFor="days">Kaç günde tamamlamak istiyorsunuz?</label>
          <input
            type="number"
            id="days"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            required
            min="1"
            placeholder="Örneğin: 30"
          />
        </div>
        <button type="submit">Yol Haritası Oluştur</button>
      </form>
    </div>
  );
};

export default CreateRoadmap; 