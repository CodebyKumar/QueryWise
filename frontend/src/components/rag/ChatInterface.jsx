import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { QueryInput } from "./QueryInput";
import { TypingIndicator } from "./TypingIndicator";
import { ragService } from "../../services/ragService";
import { exportService } from "../../services/exportService";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";

export function ChatInterface({
  session,
  onSessionUpdate,
  selectedDocuments = [],
  availableDocuments = [],
  onAttachDocuments,
  onExport,
  onDeleteSession,
  onCreateSession,
}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState('auto');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();
  const { user } = useAuth();
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Filter selected documents against available documents to handle deletions and get titles
  const validDocs = availableDocuments.filter(doc => selectedDocuments.includes(doc.filename));
  const docCount = validDocs.length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load messages from session only when session ID changes
  const [currentSessionId, setCurrentSessionId] = useState(null);

  useEffect(() => {
    if (session) {
      if (session.session_id !== currentSessionId) {
        setCurrentSessionId(session.session_id);
        setMessages(session.messages || []);
      }
    } else {
      // Virtual session state - clear messages if we switched to "New Chat"
      if (currentSessionId !== null) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
  }, [session, currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (query) => {
    if (!validDocs || validDocs.length === 0) {
      showToast({ type: "warning", message: "Please select at least one valid document from the sidebar to chat with" });
      return;
    }

    // Optimistic UI Update: Show message immediately
    const userMessage = { role: "user", content: query, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    let activeSession = session;

    // Lazy Creation Logic
    if (!activeSession) {
      if (!onCreateSession) {
        showToast({ type: "error", message: "Session creation unavailable" });
        setIsLoading(false); // Reset loading if we can't create
        setMessages((prev) => prev.slice(0, -1)); // Remove the optimistic message
        return;
      }
      try {
        // Create the session ON FIRST MESSAGE
        activeSession = await onCreateSession("New Chat");
        if (!activeSession) throw new Error("Failed to create session");
        // Update local state immediately to prevent race conditions
        setCurrentSessionId(activeSession.session_id);
      } catch (error) {
        console.error("Failed to create lazy session:", error);
        showToast({ type: "error", message: "Failed to start new chat" });
        setIsLoading(false); // Reset loading
        setMessages((prev) => prev.slice(0, -1)); // Remove the optimistic message
        return;
      }
    }

    try {
      // Use validDocs.map(d => d.filename) to only send existing documents
      const response = await ragService.query(query, 5, activeSession.session_id, validDocs.map(d => d.filename), responseStyle, selectedModel);
      if (!response || !response.answer) throw new Error("Invalid response from server");

      const assistantMessage = {
        role: "assistant", content: response.answer, sources: response.sources || [],
        query: query, timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (onSessionUpdate) onSessionUpdate();
    } catch (error) {
      const apiError = error.response?.data?.detail || error.response?.data?.answer || error.message;
      const errorMessage = {
        role: "assistant",
        content: `❌ **Error:** ${apiError || 'Something went wrong.'}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (isLoading || messages.length === 0 || !session) return;

    // Find the last user message to re-send
    const lastUserMsgIndex = messages.findLastIndex(m => m.role === 'user');
    if (lastUserMsgIndex === -1) return;

    const query = messages[lastUserMsgIndex].content;

    // Remove all messages after the last user message (essentially removing the last response(s))
    // We keep the user message so we don't need to re-add it like handleSendMessage does
    setMessages(prev => prev.slice(0, lastUserMsgIndex + 1));
    setIsLoading(true);

    try {
      const response = await ragService.query(query, 5, session.session_id, validDocs.map(d => d.filename), responseStyle, selectedModel);
      if (!response || !response.answer) throw new Error("Invalid response from server");

      const assistantMessage = {
        role: "assistant", content: response.answer, sources: response.sources || [],
        query: query, timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (onSessionUpdate) onSessionUpdate();
    } catch (error) {
      // ... error handling similar to handleSendMessage ...
      const apiError = error.response?.data?.detail || error.response?.data?.answer || error.message;
      const errorMessage = {
        role: "assistant",
        content: `❌ **Error:** ${apiError || 'Something went wrong.'}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Desktop Header - Export & Delete Actions */}
      <div className="h-[73px] hidden md:flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30 sticky top-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-800 truncate">
            {session?.title || "New Chat"}
          </h1>
          <div className="relative">
            {docCount > 0 ? (
              <button
                onClick={() => setShowDocDropdown(!showDocDropdown)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-md transition-all border border-transparent hover:border-gray-200"
              >
                <span>Referencing {docCount} document{docCount !== 1 ? 's' : ''}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showDocDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <p className="text-xs text-gray-400">No documents selected</p>
            )}

            {showDocDropdown && docCount > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDocDropdown(false)} />
                <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-1.5 border-b border-gray-50 mb-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Selected Documents</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {validDocs.map((doc, idx) => (
                      <div key={idx} className="px-4 py-2 hover:bg-gray-50 flex items-center gap-2.5 group">
                        <svg className="w-4 h-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-gray-700 font-medium truncate group-hover:text-gray-900">{doc.title || doc.filename}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>

            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => { onExport('markdown'); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    onClick={() => { onExport('pdf'); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    PDF Document
                  </button>
                </div>
              </>
            )}
          </div>

          {session && (
            <button
              onClick={onDeleteSession}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Delete Chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages Area - Increased bottom padding to prevent overlap with fixed input */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 pt-24 md:pt-4 pb-48 scroll-smooth relative">
        {/* Render "Empty State" if no session OR if session has no messages */}
        {(!session || messages.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto px-4 animate-in fade-in duration-500">
            <div className="text-center mb-8 w-full">
              <h2 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                Hello, <span className="text-orange-600">{user?.username || 'there'}</span>
              </h2>
              <p className="text-gray-500 text-xl font-light">How can I help you today?</p>
            </div>

            <div className="w-full">
              <QueryInput
                onSend={handleSendMessage}
                disabled={isLoading}
                responseStyle={responseStyle}
                onResponseStyleChange={setResponseStyle}
                onAttachClick={onAttachDocuments}
                showDisclaimer={false}
                model={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>

            {(!validDocs || validDocs.length === 0) && (
              <div className="mt-8 flex items-center gap-2 text-gray-400 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Select documents to get started
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((message, index) => {
              let queryForMessage = message.query;
              if (message.role === "assistant" && !queryForMessage && index > 0) {
                for (let i = index - 1; i >= 0; i--) {
                  if (messages[i].role === "user") {
                    queryForMessage = messages[i].content;
                    break;
                  }
                }
              }
              return (
                <MessageBubble
                  key={index}
                  type={message.role}
                  {...message}
                  query={queryForMessage}
                  onRegenerate={(index === messages.length - 1 && message.role === 'assistant') ? handleRegenerate : undefined}
                />
              );
            })}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-linear-to-t from-white via-white to-transparent px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 pt-10">
          <div className="max-w-4xl mx-auto">
            <QueryInput
              onSend={handleSendMessage}
              disabled={isLoading}
              responseStyle={responseStyle}
              onResponseStyleChange={setResponseStyle}
              onAttachClick={onAttachDocuments}
              model={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
