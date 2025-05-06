import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './RoadmapDetail.css';

const RoadmapDetail = () => {
  const { roadmapId, stageId } = useParams();
  const navigate = useNavigate();

  const [stageDetail, setStageDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userAnswers, setUserAnswers] = useState({});
  const [correctAnswers, setCorrectAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [completedStages, setCompletedStages] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchStageDetail = async () => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');

        // Get completed stages from localStorage
        const storedCompletedStages = localStorage.getItem(`completedStages_${roadmapId}`);
        const completedStagesArray = storedCompletedStages ? JSON.parse(storedCompletedStages) : [];
        setCompletedStages(completedStagesArray);

        // Check if user can access this stage
        const currentStageNumber = parseInt(stageId);
        if (currentStageNumber > 1 && !completedStagesArray.includes(currentStageNumber - 1)) {
          throw new Error('Önceki aşamayı tamamlamanız gerekiyor');
        }

        // Önce roadmap'i al
        const roadmapResponse = await fetch(`http://127.0.0.1:8000/api/roadmaps`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!roadmapResponse.ok) {
          throw new Error('Roadmap yüklenirken bir hata oluştu');
        }

        const roadmaps = await roadmapResponse.json();
        const currentRoadmap = roadmaps.find(r => r.id === parseInt(roadmapId));

        if (!currentRoadmap) {
          throw new Error('Roadmap bulunamadı');
        }

        // Content'i satırlara böl
        const contentLines = currentRoadmap.content.split('\n').filter(line => line.trim());
        const stageIndex = parseInt(stageId) - 1;

        if (stageIndex < 0 || stageIndex >= contentLines.length) {
          throw new Error('Stage bulunamadı');
        }

        const stageTitle = contentLines[stageIndex];

        // GPT API'ye istek at
        let gptDescription;
        let gptActivities;
        try {
          const gptResponse = await fetch('http://127.0.0.1:8000/api/gpt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ prompt: `"${stageTitle}" konusunu detaylı bir şekilde, en az 10 cümle ile anlat. Açıklamayı doğrudan başlat, "Tabii ki", "İşte" gibi giriş ifadeleri kullanma. Sadece konunun açıklamasını yap.` })
          });

          if (!gptResponse.ok) {
            throw new Error('GPT API yanıt vermedi');
          }

          const gptData = await gptResponse.json();
          gptDescription = gptData.description;

          // Aktivite soruları için GPT API'ye istek at
          const activitiesResponse = await fetch('http://127.0.0.1:8000/api/gpt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ prompt: `Aşağıdaki açıklamaya göre "${stageTitle}" konusu ile ilgili 4 adet çoktan seçmeli soru üret. Her soru için 4 şık olsun (A, B, C, D). Her soruyu ve şıkları ayrı satırlarda yaz. Format şu şekilde olmalı:

Soru 1: [Soru metni]
A) [Şık A]
B) [Şık B]
C) [Şık C]
D) [Şık D]

Açıklama: ${gptDescription}

Önemli: Her sorunun sadece bir doğru cevabı olmalı ve cevaplar açıklamada verilen bilgilere dayanmalı.` })
          });

          if (!activitiesResponse.ok) {
            throw new Error('GPT API yanıt vermedi');
          }

          const activitiesData = await activitiesResponse.json();
          const questionsWithOptions = activitiesData.description.split('\n\n').filter(block => block.trim());
          const formattedQuestions = questionsWithOptions.map(block => {
            const lines = block.split('\n').filter(line => line.trim());
            const question = lines[0];
            const options = lines.slice(1);
            return { question, options };
          });

          gptActivities = formattedQuestions;
        } catch (err) {
          console.error('GPT API error:', err);
          gptDescription = `${stageTitle} için açıklama alınamadı. Lütfen daha sonra tekrar deneyin.`;
          gptActivities = [`${stageTitle} için aktivite soruları alınamadı. Lütfen daha sonra tekrar deneyin.`];
        }

        if (!isMounted) return;

        // Stage detaylarını oluştur
        const stageDetail = {
          title: stageTitle,
          description: gptDescription,
          activities: gptActivities
        };

        setStageDetail(stageDetail);
      } catch (err) {
        if (!isMounted) return;
        console.error('Stage detail fetch error:', err);
        setError(err.message);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchStageDetail();

    return () => {
      isMounted = false;
    };
  }, [roadmapId, stageId]);

  const handleBackClick = () => {
    navigate('/home');
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');

      // Tüm soruları ve şıkları GPT'ye gönder
      const questionsWithOptions = stageDetail.activities.map((activity, index) => {
        return `Soru ${index + 1}: ${activity.question}\n${activity.options.join('\n')}`;
      }).join('\n\n');

      const userAnswersText = Object.entries(userAnswers).map(([index, answer]) => 
        `Soru ${parseInt(index) + 1}: ${answer}`
      ).join('\n');

      const response = await fetch('http://127.0.0.1:8000/api/gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          prompt: `Aşağıdaki çoktan seçmeli soruların doğru cevaplarını sadece harf olarak ver (A, B, C veya D). Her cevabı yeni satırda yaz. Format şu şekilde olmalı:

Soru 1: A
Soru 2: B
Soru 3: C
Soru 4: D

Sorular ve şıklar:
${questionsWithOptions}

Kullanıcının cevapları:
${userAnswersText}

Önemli: 
1. Sadece doğru cevapları ver, açıklama yapma
2. Her soru için sadece bir doğru cevap olmalı
3. Cevaplar sadece A, B, C veya D harflerinden biri olmalı
4. Her cevabı yeni satırda yaz` 
        })
      });

      if (!response.ok) {
        throw new Error('GPT API yanıt vermedi');
      }

      const data = await response.json();
      const correctAnswersText = data.description.split('\n').filter(line => line.trim());
      const correctAnswersObj = {};
      
      correctAnswersText.forEach(line => {
        const match = line.match(/Soru (\d+): ([A-D])/i);
        if (match) {
          const questionIndex = parseInt(match[1]) - 1;
          const correctAnswer = match[2].toUpperCase();
          correctAnswersObj[questionIndex] = correctAnswer;
        }
      });

      setCorrectAnswers(correctAnswersObj);
      setShowResults(true);

      // Check if all answers are correct
      const allCorrect = Object.keys(correctAnswersObj).every(
        index => correctAnswersObj[index] === userAnswers[index]
      );

      if (allCorrect) {
        // Add current stage to completed stages
        const currentStageNumber = parseInt(stageId);
        const newCompletedStages = [...completedStages, currentStageNumber];
        setCompletedStages(newCompletedStages);
        localStorage.setItem(`completedStages_${roadmapId}`, JSON.stringify(newCompletedStages));
      }
    } catch (err) {
      console.error('Error submitting answers:', err);
      setError('Cevaplar gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  if (loading) {
    return (
      <div className="stage-detail-container">
        <div className="stage-detail-header">
          <button onClick={handleBackClick} className="back-button">
            <i className="fas fa-arrow-left"></i>
            Geri Dön
          </button>
        </div>
        <div className="stage-detail-content">
          <div className="stage-title-container">
            <h1>Yükleniyor...</h1>
          </div>
          <div className="stage-detail-card">
            <div className="stage-description">
              <h2>Açıklama</h2>
              <p>İçerik yükleniyor, lütfen bekleyin...</p>
            </div>
            <div className="stage-activities">
              <h2>Aktiviteler</h2>
              <p>İçerik yükleniyor, lütfen bekleyin...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stage-detail-container">
        <div className="error-message">
          <h2>Hata</h2>
          <p>{error}</p>
          <button onClick={handleBackClick} className="back-button">
            <i className="fas fa-arrow-left"></i>
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  if (!stageDetail) {
    return (
      <div className="stage-detail-container">
        <div className="error-message">
          <h2>Aşama Bulunamadı</h2>
          <p>İstediğiniz aşama bulunamadı.</p>
          <button onClick={handleBackClick} className="back-button">
            <i className="fas fa-arrow-left"></i>
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-detail-container">
      <style>
        {`
          .question-text {
            font-size: 1.1em;
            font-weight: 500;
            margin-bottom: 15px;
            color: #333;
          }
          .answer-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-left: 20px;
          }
          .answer-options label {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
          }
          .answer-options label:hover {
            background-color: #f5f5f5;
          }
          .answer-options input[type="radio"] {
            margin: 0;
          }
          .correct {
            color: #28a745;
            font-weight: 500;
            margin-top: 10px;
          }
          .incorrect {
            color: #dc3545;
            font-weight: 500;
            margin-top: 10px;
          }
        `}
      </style>
      <div className="stage-detail-header">
        <button onClick={handleBackClick} className="back-button">
          <i className="fas fa-arrow-left"></i>
          Geri Dön
        </button>
      </div>

      <div className="stage-detail-content">
        <div className="stage-title-container">
          <h1>{stageDetail.title}</h1>
        </div>

        <div className="stage-detail-card">
          <div className="stage-description">
            <h2>Açıklama</h2>
            <p>{stageDetail.description}</p>
          </div>

          <div className="stage-activities">
            <h2>Aktiviteler</h2>
            {stageDetail.activities?.length > 0 ? (
              <div className="activities-list">
                {stageDetail.activities.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <p className="question-text">{activity.question}</p>
                    <div className="answer-options">
                      {activity.options.map((option, optionIndex) => (
                        <label key={optionIndex}>
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={option.charAt(0)}
                            onChange={() => handleAnswerChange(index, option.charAt(0))}
                            checked={userAnswers[index] === option.charAt(0)}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {showResults && (
                      <p className={userAnswers[index] === correctAnswers[index] ? 'correct' : 'incorrect'}>
                        {userAnswers[index] === correctAnswers[index] 
                          ? 'Doğru!' 
                          : `Yanlış! Doğru cevap: ${correctAnswers[index]}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-content">Bu aşama için aktivite bulunmamaktadır.</p>
            )}
            <button onClick={handleSubmit} className="submit-button">Cevapları Gönder</button>
          </div>

          {stageDetail.existing_resources?.length > 0 && (
            <div className="stage-resources">
              <h2>Önerilen Kaynaklar</h2>
              <div className="resources-list">
                {stageDetail.existing_resources.map((resource, index) => (
                  <div key={index} className="resource-card">
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      <i className="fas fa-external-link-alt"></i>
                      {resource.title}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoadmapDetail;
