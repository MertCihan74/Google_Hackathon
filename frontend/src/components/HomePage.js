import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRoadmap, setExpandedRoadmap] = useState(false);
  const [completedStages, setCompletedStages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const fetchRoadmap = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://127.0.0.1:8000/api/roadmaps', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Yol haritası yüklenirken bir hata oluştu');
      }

      const data = await response.json();
      console.log('Fetched roadmaps:', data);

      // En son oluşturulan yol haritasını al (created_at'e göre sırala)
      const sortedRoadmaps = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latestRoadmap = sortedRoadmaps.length > 0 ? sortedRoadmaps[0] : null;
      
      if (latestRoadmap) {
        console.log('Selected roadmap:', latestRoadmap);
        console.log('Roadmap ID:', latestRoadmap.id);
        console.log('Roadmap content:', latestRoadmap.content);
        setRoadmap(latestRoadmap);

        // Get completed stages for this roadmap
        const storedCompletedStages = localStorage.getItem(`completedStages_${latestRoadmap.id}`);
        const completedStagesArray = storedCompletedStages ? JSON.parse(storedCompletedStages) : [];
        setCompletedStages(completedStagesArray);
      } else {
        setError('Henüz yol haritanız bulunmuyor.');
      }
    } catch (err) {
      console.error('Yol haritası yükleme hatası:', err);
      setError(err.message || 'Yol haritası yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const toggleRoadmap = () => {
    setExpandedRoadmap(!expandedRoadmap);
  };

  const formatRoadmapContent = (content) => {
    if (!content) return [];
    return content.split('\n').filter(line => line.trim());
  };

  const isStageAccessible = (stageNumber) => {
    if (stageNumber === 1) return true;
    return completedStages.includes(stageNumber - 1);
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>Öğrenme Yol Haritaları</h1>
          <button 
            className="profile-button"
            onClick={() => navigate('/profile')}
          >
            <i className="fas fa-user"></i>
            Profil
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="create-roadmap-section">
          <h2>Yeni Bir Yol Haritası Oluştur</h2>
          <p>Hangi konuda uzmanlaşmak istiyorsun?</p>
          <button 
            className="create-roadmap-button"
            onClick={() => navigate('/chat')}
          >
            Yol Haritası Oluştur
          </button>
        </div>

        <div className="roadmaps-section">
          <h2>Son Yol Haritanız</h2>
          <div className="content-container">
            {loading ? (
              <div className="loading">Yükleniyor...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !roadmap ? (
              <div className="no-roadmaps">
                Henüz yol haritanız bulunmuyor. Yeni bir yol haritası oluşturmak için yukarıdaki butonu kullanabilirsiniz.
              </div>
            ) : (
              <div className="roadmaps-list">
                <div className="roadmap-card">
                  <div 
                    className="roadmap-header"
                    onClick={toggleRoadmap}
                  >
                    <div className="roadmap-title">
                      <h3>{roadmap.title}</h3>
                      <span className="roadmap-duration">{roadmap.description}</span>
                    </div>
                    <div className="roadmap-toggle">
                      <i className={`fas fa-chevron-${expandedRoadmap ? 'up' : 'down'}`}></i>
                    </div>
                  </div>
                  {expandedRoadmap && (
                    <div className="roadmap-content">
                      {formatRoadmapContent(roadmap.content).map((line, index) => {
                        const stageNumber = index + 1;
                        const isCompleted = completedStages.includes(stageNumber);
                        const isAccessible = isStageAccessible(stageNumber);
                        
                        return (
                          <div 
                            key={index} 
                            className={`roadmap-item ${isCompleted ? 'completed' : ''} ${!isAccessible ? 'locked' : ''}`}
                            onClick={() => {
                              if (isAccessible) {
                                navigate(`/roadmap/stage/${roadmap.id}/${stageNumber}`);
                              }
                            }}
                            style={{ 
                              cursor: isAccessible ? 'pointer' : 'not-allowed',
                              opacity: isAccessible ? 1 : 0.5
                            }}
                          >
                            <div className="stage-status">
                              {isCompleted ? (
                                <i className="fas fa-check-circle"></i>
                              ) : !isAccessible ? (
                                <i className="fas fa-lock"></i>
                              ) : (
                                <i className="fas fa-circle"></i>
                              )}
                            </div>
                            <div className="stage-content">
                              {line}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage; 