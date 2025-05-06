import React, { useState } from "react";

const RoadmapForm = ({ onRoadmapReady }) => {
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, days }),
      });
      const data = await response.json();
      onRoadmapReady(data.roadmap);
    } catch (err) {
      onRoadmapReady("Bir hata oluştu, lütfen tekrar deneyin.");
    }
    setLoading(false);
  };

  return (
    <div className="roadmap-form-container">
      <h2>Hedefini Gir</h2>
      <form onSubmit={handleSubmit}>
        <label>Hedefin nedir?</label><br />
        <input
          type="text"
          placeholder="Örn: Yazılım öğrenmek istiyorum"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          required
        /><br />
        <label>Kaç günde başarmak istiyorsun?</label><br />
        <input
          type="number"
          placeholder="Örn: 30"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          required
        /><br /><br />
        <button type="submit" disabled={loading}>
          {loading ? "Yükleniyor..." : "Yol Haritası Oluştur"}
        </button>
      </form>
    </div>
  );
};

export default RoadmapForm;

