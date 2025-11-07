import api from './api';

export const documentService = {
  async uploadFile(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/rag/upload-and-index', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: progressEvent => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress?.(progress);
      }
    });
    return response.data;
  },

  // Get list of indexed documents from backend
  async getDocuments() {
    try {
      const response = await api.get('/rag/documents');
      return response.data.documents || [];
    } catch (error) {
      console.error('Error getting documents:', error);
      // Fallback to localStorage if backend fails
      const stored = localStorage.getItem('uploaded_documents');
      return stored ? JSON.parse(stored) : [];
    }
  },

  // Track uploaded documents client-side
  addDocument(documentInfo) {
    try {
      const stored = localStorage.getItem('uploaded_documents');
      const documents = stored ? JSON.parse(stored) : [];
      
      // Add new document with timestamp
      documents.push({
        ...documentInfo,
        uploadedAt: new Date().toISOString(),
        id: Date.now().toString()
      });
      
      localStorage.setItem('uploaded_documents', JSON.stringify(documents));
      return documents;
    } catch (error) {
      console.error('Error adding document:', error);
      return [];
    }
  }
};
