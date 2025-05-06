import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './RoadmapView.css';

const RoadmapView = () => {
  const { id } = useParams();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/roadmaps/${localStorage.getItem('user_id')}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Yol haritası yüklenirken bir hata oluştu');
        }

        const data = await response.json();
        const selectedRoadmap = data.find(r => r.id === parseInt(id));
        if (!selectedRoadmap) {
          throw new Error('Yol haritası bulunamadı');
        }

        setRoadmap(selectedRoadmap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [id]);

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!roadmap) {
    return <div className="error">Yol haritası bulunamadı</div>;
  }

  return (
    <div className="roadmap-container">
      <h1>{roadmap.title}</h1>
      <p className="description">{roadmap.description}</p>
      <div className="duration-info">
        <span>Toplam Süre: {roadmap.duration} gün</span>
        <span>Oluşturulma Tarihi: {new Date(roadmap.created_at).toLocaleDateString()}</span>
      </div>

      <div className="steps-container">
        {roadmap.steps.map((step) => (
          <div key={step.day} className="step-card">
            <h2>Gün {step.day}</h2>
            <h3>{step.topic}</h3>
            <p>{step.description}</p>
            
            <div className="resources">
              <h4>Kaynaklar:</h4>
              {step.resources.books.length > 0 && (
                <div className="resource-section">
                  <h5>Kitaplar:</h5>
                  <ul>
                    {step.resources.books.map((book, index) => (
                      <li key={index}>{book}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {step.resources.articles.length > 0 && (
                <div className="resource-section">
                  <h5>Makaleler:</h5>
                  <ul>
                    {step.resources.articles.map((article, index) => (
                      <li key={index}>{article}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {step.resources.videos.length > 0 && (
                <div className="resource-section">
                  <h5>Videolar:</h5>
                  <ul>
                    {step.resources.videos.map((video, index) => (
                      <li key={index}>{video}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {step.resources.courses.length > 0 && (
                <div className="resource-section">
                  <h5>Kurslar:</h5>
                  <ul>
                    {step.resources.courses.map((course, index) => (
                      <li key={index}>{course}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoadmapView;

