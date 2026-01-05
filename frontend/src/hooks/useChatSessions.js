import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chatService } from '../services/chatService';
import { useToast } from './useToast';

export function useChatSessions() {
  const [sessions, setSessions] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
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
      // Note: We don't control selectedDocuments state here, it's in ChatPage.
      // But we expose currentSession which contains selected_documents.
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
      // Toast removed - not necessary for every new chat
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

      // Toast removed - deletion is obvious from UI change
    } catch (error) {
      showToast({ type: 'error', message: 'Failed to delete session' });
    }
  };

  // Select session
  const selectSession = (sessionId) => {
    setCurrentSessionId(sessionId);
  };

  // Load sessions on mount and handle initial state
  useEffect(() => {
    const initializeSessions = async () => {
      try {
        const data = await chatService.getSessions();
        const sessionsList = data.sessions || [];
        setSessions(sessionsList);

        // Always check if the most recent session is empty and reuse it
        const mostRecentEmpty = sessionsList.length > 0 &&
          (!sessionsList[0].messages || sessionsList[0].messages.length === 0);

        // Priority 1: URL param
        const urlSessionId = searchParams.get('session_id');
        if (urlSessionId) {
          // Verify it exists in the fetched sessions to avoid invalid IDs
          const exists = sessionsList.find(s => s.session_id === urlSessionId);
          if (exists) {
            setCurrentSessionId(urlSessionId);
            return;
          }
        }

        // Priority 2: Reuse empty session or create new one
        if (sessionsList.length > 0) {
          const mostRecent = sessionsList[0];
          // If the most recent session has messages, create a new one
          if (mostRecent.messages && mostRecent.messages.length > 0) {
            await createSession();
          } else {
            // If it's empty, reuse it
            setCurrentSessionId(mostRecent.session_id);
          }
        } else {
          // No sessions exist, create first one
          await createSession();
        }
      } catch (error) {
        console.error('Error initializing sessions:', error);
      }
    };
    initializeSessions();
  }, []);

  // Sync URL when currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
      setSearchParams({ session_id: currentSessionId }, { replace: true });
      loadSession(currentSessionId);
    } else {
      // If explicitly null (New Chat), maybe clear param?
      // But be careful not to loop if we cleared it.
      // For now, let's only clear if we are sure. 
      // If we just loaded and it's null, we want to clear.
      if (searchParams.get('session_id')) {
        setSearchParams({}, { replace: true });
      }
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
    refreshCurrentSession: async () => {
      // Refresh both current session and sessions list (for title update)
      await Promise.all([
        loadSession(currentSessionId),
        loadSessions()
      ]);
    }
  };
}
