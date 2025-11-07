import { useState, useEffect } from 'react';
import { chatService } from '../services/chatService';
import { useToast } from './useToast';

export function useChatSessions() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Load all sessions
  const loadSessions = async () => {
    try {
      const data = await chatService.getSessions();
      setSessions(data.sessions || []);
      
      // If no current session and sessions exist, select the first one
      if (!currentSessionId && data.sessions && data.sessions.length > 0) {
        setCurrentSessionId(data.sessions[0].session_id);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Load specific session
  const loadSession = async (sessionId) => {
    if (!sessionId) return;
    
    try {
      const session = await chatService.getSession(sessionId);
      setCurrentSession(session);
    } catch (error) {
      console.error('Error loading session:', error);
      showToast({ type: 'error', message: 'Failed to load session' });
    }
  };

  // Create new session
  const createSession = async (title = 'New Chat') => {
    setLoading(true);
    try {
      const session = await chatService.createSession(title);
      setSessions(prev => [session, ...prev]);
      setCurrentSessionId(session.session_id);
      setCurrentSession(session);
      showToast({ type: 'success', message: 'New chat created' });
      return session;
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to create session' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const deleteSession = async (sessionId) => {
    try {
      await chatService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      
      // If deleted current session, select another
      if (currentSessionId === sessionId) {
        const remaining = sessions.filter(s => s.session_id !== sessionId);
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].session_id);
        } else {
          setCurrentSessionId(null);
          setCurrentSession(null);
        }
      }
      
      showToast({ type: 'success', message: 'Chat deleted' });
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to delete session' });
    }
  };

  // Select session
  const selectSession = (sessionId) => {
    setCurrentSessionId(sessionId);
  };

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load current session when ID changes
  useEffect(() => {
    if (currentSessionId) {
      loadSession(currentSessionId);
    }
  }, [currentSessionId]);

  return {
    sessions,
    currentSessionId,
    currentSession,
    loading,
    createSession,
    deleteSession,
    selectSession,
    refreshSessions: loadSessions,
    refreshCurrentSession: () => loadSession(currentSessionId)
  };
}
