import React, { useState } from "react";
import { register } from "../api/auth";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Şifreler uyuşmuyor!");
      return;
    }

    try {
      const response = await register(email, password);
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        setMessage("Kayıt başarılı! Giriş yapabilirsiniz.");
        setTimeout(() => {
          navigate('/home');
        }, 2000);
      } else {
        setError('Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.');
      }
    } catch (error) {
     // setError(error.detail || "Kayıt yapılırken bir hata oluştu");
    }
  };

  return (
    <div className="signup-container">
      <h2>Kayıt Ol</h2>
      <form onSubmit={handleSubmit}>
        <label>Email:</label><br />
        <input
          type="email"
          placeholder="Email adresinizi girin"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br />
        <label>Şifre:</label><br />
        <input
          type="password"
          placeholder="Şifrenizi girin"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br />
        <label>Şifreyi Tekrarla:</label><br />
        <input
          type="password"
          placeholder="Şifrenizi tekrar girin"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        /><br /><br />
        <button type="submit">Kayıt Ol</button>
      </form>
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default Register;

