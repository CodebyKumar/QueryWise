import api from './api';

export const chatService = {
  async createSession(title = 'New Chat') {
    const response = await api.post('/chat/sessions', { title });
    return response.data;
  },

  async getSessions() {
    const response = await api.get('/chat/sessions');
    return response.data;
  },

  async getSession(sessionId) {
    const response = await api.get(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  async deleteSession(sessionId) {
    const response = await api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  async updateSessionTitle(sessionId, title) {
    const response = await api.patch(`/chat/sessions/${sessionId}/title`, { title });
    return response.data;
  },

  async updateSessionDocuments(sessionId, documents) {
    const response = await api.put(`/chat/sessions/${sessionId}/documents`, { documents });
    return response.data;
  }
};
