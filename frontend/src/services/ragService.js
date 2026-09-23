import api from "./api";

export const ragService = {
  async query(queryText, topK = 5, sessionId = null, selectedDocuments = [], responseStyle = 'auto', model = 'gemini-2.5-flash', dbConnected = false) {
    try {
      let url = '/rag/query';
      const params = new URLSearchParams();

      if (sessionId) {
        params.append('session_id', sessionId);
      }

      if (selectedDocuments && selectedDocuments.length > 0) {
        selectedDocuments.forEach(doc => params.append('documents', doc));
      }

      if (params.toString()) {
        url += '?' + params.toString();
      }

      console.log('RAG Query:', {
        url,
        body: { query: queryText, top_k: topK, response_style: responseStyle, model, db_connected: dbConnected },
        params: params.toString()
      });

      const response = await api.post(url, {
        query: queryText,
        top_k: topK,
        response_style: responseStyle,
        model,
        db_connected: dbConnected,
        selected_documents: selectedDocuments
      });

      console.log('RAG Response:', response);

      // Validate response
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }

      return response.data;
    } catch (error) {
      console.error('Error in ragService.query:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  },

  async queryStream(queryText, topK = 5, sessionId = null, selectedDocuments = [], responseStyle = 'auto', model = 'gemini-2.5-flash', dbConnected = false, onChunk, onMetadata) {
    try {
      let relativeUrl = '/rag/query-stream';
      const params = new URLSearchParams();

      if (sessionId) {
        params.append('session_id', sessionId);
      }

      if (selectedDocuments && selectedDocuments.length > 0) {
        selectedDocuments.forEach(doc => params.append('documents', doc));
      }

      if (params.toString()) {
        relativeUrl += '?' + params.toString();
      }

      const baseURL = api.defaults.baseURL || '';
      const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseURL}${relativeUrl}`;
      const token = localStorage.getItem('token');

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query: queryText,
          top_k: topK,
          response_style: responseStyle,
          model,
          db_connected: dbConnected,
          selected_documents: selectedDocuments
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Streaming failed (${response.status}): ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === 'metadata' && onMetadata) {
                onMetadata(data);
              } else if (data.type === 'chunk' && onChunk) {
                onChunk(data.text);
              }
            } catch (err) {
              console.error('Error parsing SSE event:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in ragService.queryStream:', error);
      throw error;
    }
  },

  async indexDocument(document) {
    const response = await api.post("/rag/index", document);
    return response.data;
  },

  async exportToPDF(data) {
    const response = await api.post("/export/pdf", data, {
      responseType: "blob", // Important for file download
    });

    // Create a blob URL and trigger download
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Get filename from Content-Disposition header if available
    const contentDisposition = response.headers["content-disposition"];
    let filename = "rag_response.pdf";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return response.data;
  },
};
