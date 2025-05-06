import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import Register from './components/Register';
import RoadmapDetail from './components/RoadmapDetail';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatInterface /></ProtectedRoute>} />
          <Route path="/roadmap/stage/:roadmapId/:stageId" element={<ProtectedRoute><RoadmapDetail /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
