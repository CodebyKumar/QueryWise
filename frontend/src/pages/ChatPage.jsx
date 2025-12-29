import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { chatService } from "../services/chatService";
import { exportService } from "../services/exportService";
import { ChatInterface } from "../components/rag/ChatInterface";
import { ChatSidebar } from "../components/chat/ChatSidebar";
import { RightSidebar } from "../components/layout/RightSidebar";
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
  const [showUploadInSidebar, setShowUploadInSidebar] = useState(false);
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

  const handleExport = async (format) => {
    if (!currentSession) return;
    try {
      await exportService.exportChatSession(currentSession, currentSession.messages, format);
    } catch (error) {
      console.error('Export failed:', error);
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

  // Sync selected documents when session changes
  useEffect(() => {
    if (currentSession?.selected_documents) {
      setSelectedDocuments(currentSession.selected_documents);
    } else {
      setSelectedDocuments([]);
    }
  }, [currentSession]);

  const handleDocumentSelectionChange = (docs) => {
    setSelectedDocuments(docs);
    if (currentSessionId) {
      // Persist to backend without awaiting
      chatService.updateSessionDocuments(currentSessionId, docs)
        .catch(err => console.error("Failed to update session documents", err));
    }
  };

  const handleTitleUpdate = async (newTitle) => {
    if (currentSessionId && newTitle) {
      try {
        await chatService.updateSessionTitle(currentSessionId, newTitle);
        refreshCurrentSession(); // Refresh current session to show new title in header if needed
        refreshSessions();      // Refresh sidebar list
      } catch (error) {
        console.error("Failed to update title:", error);
      }
    }
  };

  return (
    <div className="h-screen-safe flex flex-col bg-white">
      <div className="block">
        <Header />
      </div>

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
          fixed md:relative inset-y-0 left-0 z-[70] md:z-30
          transform transition-transform duration-300 ease-in-out
          ${showLeftSidebar
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
            }
          w-[280px] sm:w-72 md:w-64
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
            onDocumentSelectionChange={handleDocumentSelectionChange}
            onClose={() => setShowLeftSidebar(false)}
            showUpload={showUploadInSidebar}
            onShowUploadChange={setShowUploadInSidebar}
          />
        </div>

        {/* Overlay for mobile left sidebar */}
        {showLeftSidebar && (
          <div
            className="fixed inset-0 bg-gray-900/10 backdrop-blur-xs z-50 md:hidden"
            onClick={() => setShowLeftSidebar(false)}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
          {/* Refined Mobile Header - Minimalist & Elegant */}
          <div className="md:hidden flex items-center h-14 px-4 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
            <button
              onClick={() => setShowLeftSidebar(true)}
              className="p-2 -ml-2 text-gray-400 hover:text-orange-600 transition-colors"
              aria-label="Toggle sessions"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1 min-w-0 px-2 flex justify-center">
              <h1 className="text-sm font-bold text-gray-800 truncate tracking-tight">
                {currentSession?.title || "New Chat"}
              </h1>
            </div>

            <div className="flex items-center gap-1">
              {/* Delete Chat Button - Only show if there's a current session */}
              {currentSession && (
                <button
                  onClick={() => handleDeleteSession(currentSessionId)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Delete current chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}

              {/* Export Chat Button */}
              {currentSession && (
                <div className="relative group">
                  <button
                    className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                    aria-label="Export chat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  {/* Dropdown for Export */}
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
                    <button onClick={() => handleExport('markdown')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700">Markdown</button>
                    <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700">PDF</button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowRightSidebar(true)}
                className="p-2 -mr-2 text-gray-400 hover:text-orange-600 transition-colors"
                aria-label="Toggle notes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>

          <ChatInterface
            session={currentSession}
            onSessionUpdate={refreshCurrentSession}
            onTitleUpdate={handleTitleUpdate}
            selectedDocuments={selectedDocuments}
            onAttachDocuments={() => {
              setShowLeftSidebar(true);
              setShowUploadInSidebar(true);
            }}
            onExport={handleExport}
            onDeleteSession={() => handleDeleteSession(currentSessionId)}
          />
        </div>

        {/* Right Sidebar - Flexible Sidebar */}
        <div
          className={`
          fixed md:relative inset-y-0 right-0 z-[70] md:z-30
          transform transition-transform duration-300 ease-in-out
          ${showRightSidebar
              ? "translate-x-0 outline-none shadow-2xl"
              : "translate-x-full md:translate-x-0"
            }
          w-full sm:w-80 md:w-auto
        `}
        >
          <RightSidebar
            sessionId={currentSessionId}
            onClose={() => setShowRightSidebar(false)}
          />
        </div>

        {/* Overlay for mobile right sidebar */}
        {showRightSidebar && (
          <div
            className="fixed inset-0 bg-gray-900/10 backdrop-blur-xs z-50 md:hidden"
            onClick={() => setShowRightSidebar(false)}
          />
        )}
      </div>
    </div>
  );
}
