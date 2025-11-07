import api from './api';

export const authService = {
  async login(username, password) {
    const response = await api.post('/login', { username, password });
    return response.data;
  },
  
  async signup(userData) {
    const response = await api.post('/signup', userData);
    return response.data;
  },
  
  async getCurrentUser() {
    const response = await api.get('/me');
    return response.data;
  }
};
