import React, { useState } from "react";
import "./Chat.css";

const Chat = () => {
  const [messages, setMessages] = useState([
    { text: "Hangi konu üzerine çalışmak istiyorsun?", isBot: true }
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState("topic"); // topic or duration

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { text: input, isBot: false }]);

    if (step === "topic") {
      // Add bot's duration question
      setMessages(prev => [...prev, { text: "Ne kadar süre çalışmak istiyorsun?", isBot: true }]);
      setStep("duration");
    } else {
      // Handle duration response
      setMessages(prev => [...prev, { 
        text: `Anladım! ${messages[messages.length - 2].text} konusunda ${input} süre çalışacaksın.`, 
        isBot: true 
      }]);
      setStep("topic");
      setMessages(prev => [...prev, { text: "Hangi konu üzerine çalışmak istiyorsun?", isBot: true }]);
    }

    setInput("");
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.isBot ? 'bot' : 'user'}`}>
            {message.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mesajınızı yazın..."
          className="chat-input"
        />
        <button type="submit" className="send-button">Gönder</button>
      </form>
    </div>
  );
};

export default Chat;

