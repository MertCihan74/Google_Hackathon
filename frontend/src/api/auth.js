import axios from 'axios';

const API_URL = 'http://localhost:8000/api/auth';

export const register = async (email, password) => {
  const response = await axios.post(`${API_URL}/register`, {
    email,
    password
  });
  return response.data;
};

export const login = async (email, password) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);

  const response = await axios.post(`${API_URL}/token`, formData);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const response = await axios.get(`${API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    localStorage.removeItem('token');
    return null;
  }
}; 