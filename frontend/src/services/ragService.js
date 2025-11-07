import api from './api';

export const ragService = {
  async query(queryText, topK = 5, sessionId = null) {
    const url = sessionId ? `/rag/query?session_id=${sessionId}` : '/rag/query';
    const response = await api.post(url, {
      query: queryText,
      top_k: topK
    });
    return response.data;
  },
  
  async indexDocument(document) {
    const response = await api.post('/rag/index', document);
    return response.data;
  }
};
