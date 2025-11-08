import { useState } from "react";
import { Header } from "../components/layout/Header";
import { ChatInterface } from "../components/rag/ChatInterface";
import { ChatSidebar } from "../components/chat/ChatSidebar";
import { NotesPanel } from "../components/notes/NotesPanel";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { useChatSessions } from "../hooks/useChatSessions";

export function ChatPage() {
  const {
    sessions,
    currentSessionId,
    currentSession,
    createSession,
    deleteSession,
    selectSession,
    refreshSessions,
    refreshCurrentSession,
  } = useChatSessions();

  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const handleNewSession = async () => {
    try {
      await createSession();
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    setSessionToDelete(sessionId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (sessionToDelete) {
      await deleteSession(sessionToDelete);
      setDeleteConfirmOpen(false);
      setSessionToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setSessionToDelete(null);
  };

  const handleUploadSuccess = () => {
    // Toast already shown by DocumentUpload component
    refreshSessions();
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Chat Sessions */}
        <div
          className={`
          fixed md:relative inset-y-0 left-0 z-30 
          transform transition-transform duration-300 ease-in-out
          ${
            showLeftSidebar
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
          w-64 md:w-64
        `}
        >
          <ChatSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={(id) => {
              selectSession(id);
              setShowLeftSidebar(false);
            }}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onUploadSuccess={handleUploadSuccess}
            selectedDocuments={selectedDocuments}
            onDocumentSelectionChange={setSelectedDocuments}
          />
        </div>

        {/* Overlay for mobile */}
        {showLeftSidebar && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setShowLeftSidebar(false)}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white relative">
          {/* Mobile Toggle Buttons */}
          <div className="md:hidden absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
            <button
              onClick={() => setShowLeftSidebar(true)}
              className="p-2 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-50 transition-colors pointer-events-auto"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowRightSidebar(true)}
              className="p-2 bg-white border border-gray-200 rounded-lg shadow-md hover:bg-gray-50 transition-colors pointer-events-auto"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>

          <ChatInterface
            session={currentSession}
            onSessionUpdate={refreshCurrentSession}
            selectedDocuments={selectedDocuments}
          />
        </div>

        {/* Right Sidebar - Notes Panel */}
        <div
          className={`
          fixed md:relative inset-y-0 right-0 z-30
          transform transition-transform duration-300 ease-in-out
          ${
            showRightSidebar
              ? "translate-x-0"
              : "translate-x-full md:translate-x-0"
          }
        `}
        >
          <NotesPanel
            sessionId={currentSessionId}
            onClose={() => setShowRightSidebar(false)}
          />
        </div>

        {/* Overlay for mobile right sidebar */}
        {showRightSidebar && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setShowRightSidebar(false)}
          />
        )}
      </div>
    </div>
  );
}
