import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatInterface.css';

const ChatInterface = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hangi konu üzerine çalışmak istiyorsun?'
  }]);
  const [goal, setGoal] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [dailyTime, setDailyTime] = useState('');
  const [importance, setImportance] = useState('');
  const [days, setDays] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const fetchUserRoadmaps = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`http://127.0.0.1:8000/api/roadmaps`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error('Yol haritaları yüklenirken bir hata oluştu');
      }

      const data = await response.json();
      setRoadmaps(data);
    } catch (err) {
      console.error('Error fetching roadmaps:', err);
      setError(err.message);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserRoadmaps();
  }, [fetchUserRoadmaps]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      if (!goal) {
        setGoal(input);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Hedefine ulaştığını nasıl anlayacaksın?'
        }]);
      } else if (!successCriteria) {
        setSuccessCriteria(input);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Günlük olarak bu konuya ne kadar vakit ayırabilirsin?'
        }]);
      } else if (!dailyTime) {
        setDailyTime(input);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Bu konu senin için neden önemli?'
        }]);
      } else if (!importance) {
        setImportance(input);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Bu konuyu kaç gün içinde öğrenmek istiyorsun?'
        }]);
      } else if (!days) {
        setDays(input);
        setIsLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const requestData = {
          goal: goal,
          days: parseInt(input)
        };
        console.log("Sending request to backend with:", requestData);

        const response = await fetch('http://127.0.0.1:8000/api/roadmap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Yol haritası oluşturulurken bir hata oluştu');
        }

        const data = await response.json();
        console.log("Received roadmap data:", data);

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Yol haritanız başarıyla oluşturuldu! Ana sayfaya yönlendiriliyorsunuz...'
        }]);

        await fetchUserRoadmaps();

        setGoal('');
        setSuccessCriteria('');
        setDailyTime('');
        setImportance('');
        setDays('');
        setInput('');

        // Ana sayfaya yönlendir
        setTimeout(() => {
          navigate('/home');
        }, 7000);
      }
    } catch (err) {
      console.error("Detailed error:", err);
      setError(err.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Üzgünüm, bir hata oluştu: ${err.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatRoadmap = (roadmap, currentGoal, currentDuration) => {
    if (!roadmap) {
      console.error("Invalid roadmap data:", roadmap);
      return <div>Yol haritası verisi geçersiz</div>;
    }

    console.log("Formatting roadmap:", roadmap);

    const roadmapGoal = roadmap.title || currentGoal;
    const roadmapDuration = roadmap.duration || currentDuration;
    const steps = roadmap.steps || [];

    return (
      <div className="roadmap-container">
        <h2>Yol Haritanız</h2>
        <div className="roadmap-content">
          <h3>Hedef: {roadmapGoal}</h3>
          <h3>Süre: {roadmapDuration} gün</h3>
          
          <div className="steps-container">
            {steps.map((step, index) => (
              <div key={index} className="step-card">
                <h4>{step.title || `Adım ${index + 1}`}</h4>
                <p>{step.description || 'Açıklama yok'}</p>
                {step.resources && step.resources.length > 0 && (
                  <div className="resources">
                    <h5>Kaynaklar:</h5>
                    <ul>
                      {step.resources.map((resource, rIndex) => (
                        <li key={rIndex}>
                          <a href={resource.url || '#'} target="_blank" rel="noopener noreferrer">
                            {resource.title || 'Kaynak başlığı yok'}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleRoadmapClick = (roadmap) => {
    setSelectedRoadmap(roadmap);
    setMessages([{
      role: 'assistant',
      content: formatRoadmap(roadmap, roadmap.title, roadmap.duration)
    }]);
  };

  return (
    <div className="chat-interface-container">
      <div className="roadmaps-sidebar">
        <h2>Yol Haritalarım</h2>
        <button 
          className="new-roadmap-button"
          onClick={() => {
            setSelectedRoadmap(null);
            setMessages([]);
            setGoal('');
            setDays('');
          }}
        >
          Yeni Yol Haritası Oluştur
        </button>
        <div className="roadmaps-list">
          {roadmaps.map((roadmap) => (
            <div 
              key={roadmap.id} 
              className={`roadmap-item ${selectedRoadmap?.id === roadmap.id ? 'selected' : ''}`}
              onClick={() => handleRoadmapClick(roadmap)}
            >
              <h3>{roadmap.title}</h3>
              <p>{roadmap.description}</p>
              <span className="roadmap-duration">{roadmap.duration} gün</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              {typeof message.content === 'string' ? (
                message.content
              ) : (
                message.content
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && <div className="error-message">{error}</div>}
        {!selectedRoadmap && (
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mesajınızı yazın..."
              disabled={isLoading}
              className="chat-input"
            />
            <button type="submit" disabled={isLoading} className="send-button">
              Gönder
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;