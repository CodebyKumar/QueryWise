import { Header } from '../components/layout/Header';
import { ChatInterface } from '../components/rag/ChatInterface';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { useChatSessions } from '../hooks/useChatSessions';
import { useToast } from '../hooks/useToast';

export function ChatPage() {
  const {
    sessions,
    currentSessionId,
    currentSession,
    loading,
    createSession,
    deleteSession,
    selectSession,
    refreshSessions,
    refreshCurrentSession
  } = useChatSessions();

  const { showToast } = useToast();

  const handleNewSession = async () => {
    try {
      await createSession();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      await deleteSession(sessionId);
    }
  };

  const handleUploadSuccess = () => {
    showToast({ type: 'success', message: 'Document uploaded successfully!' });
    refreshSessions();
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={selectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onUploadSuccess={handleUploadSuccess}
        />
        <div className="flex-1 flex flex-col">
          <ChatInterface 
            session={currentSession}
            onSessionUpdate={refreshCurrentSession}
          />
        </div>
      </div>
    </div>
  );
}
