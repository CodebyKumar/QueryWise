import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { QueryInput } from "./QueryInput";
import { TypingIndicator } from "./TypingIndicator";
import { ragService } from "../../services/ragService";
import { exportService } from "../../services/exportService";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";

import { authService } from "../../services/authService";

export function ChatInterface({
  session,
  onSessionUpdate,
  selectedDocuments = [],
  availableDocuments = [],
  dbConnected = false,
  onAttachDocuments,
  onExport,
  onDeleteSession,
  onCreateSession,
  showRightSidebar = false,
  onToggleRightSidebar,
}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState('auto');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();
  const { user } = useAuth();
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  
  // Persistent & Intelligent Model Selection
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('preferred_model') || 'gemini-2.5-flash';
  });

  useEffect(() => {
    const detectDefaultModel = async () => {
      try {
        const userData = await authService.getCurrentUser();
        const providers = userData?.user?.configured_providers || [];
        const savedModel = localStorage.getItem('preferred_model') || 'gemini-2.5-flash';
        
        const isGeminiSelected = savedModel.includes('gemini');
        const hasGoogle = providers.includes('google_api_key');
        const hasGroq = providers.includes('groq_api_key');

        if (isGeminiSelected && !hasGoogle && hasGroq) {
          setSelectedModel('llama-3.3-70b-versatile');
        } else if (!isGeminiSelected && !hasGroq && hasGoogle) {
          setSelectedModel('gemini-2.5-flash');
        } else if (savedModel) {
          setSelectedModel(savedModel);
        }
      } catch (err) {
        console.error('Failed to detect available API providers:', err);
      }
    };
    detectDefaultModel();
  }, []);

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('preferred_model', modelId);
  };

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
    if (!dbConnected && (!validDocs || validDocs.length === 0)) {
      showToast({ type: "warning", message: "Please select at least one document or enable Database connection" });
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
        setIsLoading(false);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      try {
        activeSession = await onCreateSession("New Chat");
        if (!activeSession) throw new Error("Failed to create session");
        setCurrentSessionId(activeSession.session_id);
      } catch (error) {
        console.error("Failed to create lazy session:", error);
        showToast({ type: "error", message: "Failed to start new chat" });
        setIsLoading(false);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
    }

    // Create initial streaming assistant placeholder message
    const assistantPlaceholder = {
      role: "assistant",
      content: "",
      sources: [],
      thoughts: null,
      sqlQuery: null,
      query: query,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      await ragService.queryStream(
        query,
        5,
        activeSession.session_id,
        validDocs.map(d => d.filename),
        responseStyle,
        selectedModel,
        dbConnected,
        (chunkText) => {
          setIsLoading(false); // Hide typing indicator once tokens start arriving
          setMessages((prev) => {
            const newArr = [...prev];
            const lastIdx = newArr.length - 1;
            if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
              newArr[lastIdx] = {
                ...newArr[lastIdx],
                content: (newArr[lastIdx].content || "") + chunkText
              };
            }
            return newArr;
          });
        },
        (meta) => {
          setMessages((prev) => {
            const newArr = [...prev];
            const lastIdx = newArr.length - 1;
            if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
              newArr[lastIdx] = {
                ...newArr[lastIdx],
                sources: meta.sources || [],
                thoughts: meta.thoughts,
                sqlQuery: meta.sql_query
              };
            }
            return newArr;
          });
        }
      );

      if (onSessionUpdate) onSessionUpdate(activeSession.session_id);
    } catch (error) {
      console.warn("Streaming failed, attempting fallback query...", error);
      try {
        const response = await ragService.query(
          query, 5, activeSession.session_id, validDocs.map(d => d.filename), responseStyle, selectedModel, dbConnected
        );
        if (response && response.answer) {
          setMessages((prev) => {
            const newArr = [...prev];
            const lastIdx = newArr.length - 1;
            if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
              newArr[lastIdx] = {
                role: "assistant", 
                content: response.answer, 
                sources: response.sources || [],
                thoughts: response.thoughts,
                sqlQuery: response.sql_query,
                query: query, 
                timestamp: new Date().toISOString()
              };
            }
            return newArr;
          });
          if (onSessionUpdate) onSessionUpdate(activeSession.session_id);
        }
      } catch (fallbackErr) {
        const apiError = fallbackErr.response?.data?.detail || fallbackErr.message;
        setMessages((prev) => {
          const newArr = [...prev];
          const lastIdx = newArr.length - 1;
          if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
            newArr[lastIdx] = {
              role: "assistant",
              content: `❌ **Error:** ${apiError || 'Something went wrong.'}`,
              timestamp: new Date().toISOString(),
              isError: true
            };
          }
          return newArr;
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (isLoading || messages.length === 0 || !session) return;

    const lastUserMsgIndex = messages.findLastIndex(m => m.role === 'user');
    if (lastUserMsgIndex === -1) return;

    const query = messages[lastUserMsgIndex].content;

    setMessages(prev => prev.slice(0, lastUserMsgIndex + 1));
    setIsLoading(true);

    const assistantPlaceholder = {
      role: "assistant",
      content: "",
      sources: [],
      thoughts: null,
      sqlQuery: null,
      query: query,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      await ragService.queryStream(
        query,
        5,
        session.session_id,
        validDocs.map(d => d.filename),
        responseStyle,
        selectedModel,
        dbConnected,
        (chunkText) => {
          setIsLoading(false);
          setMessages((prev) => {
            const newArr = [...prev];
            const lastIdx = newArr.length - 1;
            if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
              newArr[lastIdx] = {
                ...newArr[lastIdx],
                content: (newArr[lastIdx].content || "") + chunkText
              };
            }
            return newArr;
          });
        },
        (meta) => {
          setMessages((prev) => {
            const newArr = [...prev];
            const lastIdx = newArr.length - 1;
            if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
              newArr[lastIdx] = {
                ...newArr[lastIdx],
                sources: meta.sources || [],
                thoughts: meta.thoughts,
                sqlQuery: meta.sql_query
              };
            }
            return newArr;
          });
        }
      );

      if (onSessionUpdate) onSessionUpdate(session.session_id);
    } catch (error) {
      console.warn("Regenerate stream failed, trying fallback...", error);
      try {
        const response = await ragService.query(query, 5, session.session_id, validDocs.map(d => d.filename), responseStyle, selectedModel, dbConnected);
        if (response && response.answer) {
          setMessages((prev) => {
            const newArr = [...prev];
            const lastIdx = newArr.length - 1;
            if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
              newArr[lastIdx] = {
                role: "assistant", content: response.answer, sources: response.sources || [],
                query: query, timestamp: new Date().toISOString()
              };
            }
            return newArr;
          });
          if (onSessionUpdate) onSessionUpdate(session.session_id);
        }
      } catch (fallbackErr) {
        const apiError = fallbackErr.response?.data?.detail || fallbackErr.message;
        setMessages((prev) => {
          const newArr = [...prev];
          const lastIdx = newArr.length - 1;
          if (lastIdx >= 0 && newArr[lastIdx].role === "assistant") {
            newArr[lastIdx] = {
              role: "assistant",
              content: `❌ **Error:** ${apiError || 'Something went wrong.'}`,
              timestamp: new Date().toISOString(),
              isError: true
            };
          }
          return newArr;
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Desktop Header - Export, Delete & Notes Toggle Actions */}
      <div className="h-[73px] hidden md:flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30 sticky top-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-800 truncate">
            {session?.title || "New Chat"}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="relative">
              {docCount > 0 ? (
                <button
                  onClick={() => setShowDocDropdown(!showDocDropdown)}
                  className="flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-md transition-all border border-orange-200 font-medium"
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
                      <p className="text-xs font-semibold text-gray-600">Selected Documents</p>
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

            {dbConnected && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                DB Pipeline Active
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notes Toggle Button */}
          {onToggleRightSidebar && (
            <button
              onClick={onToggleRightSidebar}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${
                showRightSidebar
                  ? "text-orange-600 bg-orange-50 border border-orange-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent"
              }`}
              title={showRightSidebar ? "Hide notes sidebar" : "Show notes sidebar"}
              aria-label="Toggle notes"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Notes</span>
            </button>
          )}

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
                onModelChange={handleModelChange}
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
              onModelChange={handleModelChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
