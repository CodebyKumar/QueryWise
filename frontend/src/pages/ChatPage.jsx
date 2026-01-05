import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { chatService } from "../services/chatService";
import { exportService } from "../services/exportService";
import { documentService } from "../services/documentService";
import { authService } from "../services/authService";
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
    loading: sessionsLoading,
  } = useChatSessions();

  const location = useLocation();

  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showUploadInSidebar, setShowUploadInSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const handleNewSession = async () => {
    try {
      const newSession = await createSession();
      if (newSession) {
        selectSession(newSession.session_id);
      }
    } catch (error) {
      console.error("Failed to create new session:", error);
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

  const [allDocuments, setAllDocuments] = useState([]);

  // Fetch all documents on mount and when sidebar uploads success
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await documentService.getDocuments();
      setAllDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  };

  // Check for API Configuration
  const [missingApiKey, setMissingApiKey] = useState(false);

  useEffect(() => {
    const checkApiConfiguration = async () => {
      try {
        const userData = await authService.getCurrentUser();
        const providers = userData?.user?.configured_providers || [];
        if (!providers.includes("google_api_key")) {
          setMissingApiKey(true);
        } else {
          setMissingApiKey(false);
        }
      } catch (error) {
        console.error("Failed to check API configuration", error);
      }
    };
    checkApiConfiguration();
  }, []);

  const handleUploadSuccess = () => {
    // Toast already shown by DocumentUpload component
    refreshSessions();
    loadDocuments(); // Refresh document list
  };

  // Sync selected documents when session changes using filename matching
  // This also handles the case where a document was deleted; it simply won't be found in allDocuments if we filtered here.
  // However, currentSession.selected_documents contains filenames. We pass these to ChatSidebar to control checkboxes.
  // We pass allDocuments to ChatInterface so it can derive titles and validity.
  useEffect(() => {
    if (currentSession?.selected_documents) {
      setSelectedDocuments(currentSession.selected_documents);
    } else {
      setSelectedDocuments([]);
    }
  }, [currentSession]);

  // ... (rest of code)



  const handleDocumentSelectionChange = (docs) => {
    setSelectedDocuments(docs);
    if (currentSessionId) {
      // Persist to backend without awaiting
      chatService.updateSessionDocuments(currentSessionId, docs)
        .catch(err => console.error("Failed to update session documents", err));
    }
  };

  const handleRenameSession = async (sessionId, newTitle) => {
    if (!sessionId || !newTitle) return;
    try {
      await chatService.updateSessionTitle(sessionId, newTitle);
      if (sessionId === currentSessionId) refreshCurrentSession();
      refreshSessions();
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  // Handle "New Chat" logic from navigation (e.g. after login)
  useEffect(() => {
    if (location.state?.newChat && currentSessionId) {
      selectSession(null);
      // Clear the state so it doesn't trigger again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, currentSessionId]);

  return (
    <div className="h-screen-safe flex flex-col bg-white">
      <div className="block">
        <Header />
      </div>

      {sessionsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
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
                onRenameSession={handleRenameSession}
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
              {/* Missing API Key Banner */}
              {missingApiKey && (
                <div className="bg-orange-50 border-b border-orange-100 px-4 py-3 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-orange-800">
                      <span className="font-medium">Configuration Required:</span> Please set your Google Gemini API key to start chatting.
                    </p>
                  </div>
                  <a
                    href="/account"
                    className="text-sm font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap bg-white px-3 py-1.5 rounded-md border border-orange-200 shadow-sm hover:shadow transition-all"
                  >
                    Configure Keys
                  </a>
                </div>
              )}

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
                onTitleUpdate={(newTitle) => handleRenameSession(currentSessionId, newTitle)}
                selectedDocuments={selectedDocuments}
                availableDocuments={allDocuments}
                onAttachDocuments={() => {
                  setShowLeftSidebar(true);
                  setShowUploadInSidebar(true);
                }}
                onExport={handleExport}
                onDeleteSession={() => handleDeleteSession(currentSessionId)}
                onCreateSession={createSession}
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
        </>
      )}
    </div>
  );
}
