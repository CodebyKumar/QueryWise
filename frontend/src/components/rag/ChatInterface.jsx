import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { QueryInput } from "./QueryInput";
import { TypingIndicator } from "./TypingIndicator";
import { ragService } from "../../services/ragService";
import { exportService } from "../../services/exportService";
import { useToast } from "../../hooks/useToast";

export function ChatInterface({
  session,
  onSessionUpdate,
  selectedDocuments = [],
  onAttachDocuments,
  onExport,
  onDeleteSession
}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState('auto');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();

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
      setCurrentSessionId(null);
      setMessages([]);
    }
  }, [session, currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (query) => {
    if (!session) {
      showToast({ type: "error", message: "Please create or select a chat session first" });
      return;
    }
    if (!selectedDocuments || selectedDocuments.length === 0) {
      showToast({ type: "warning", message: "Please select at least one document from the sidebar to chat with" });
      return;
    }

    const userMessage = { role: "user", content: query, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await ragService.query(query, 5, session.session_id, selectedDocuments, responseStyle);
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
    if (isLoading || messages.length === 0) return;

    // Find the last user message to re-send
    const lastUserMsgIndex = messages.findLastIndex(m => m.role === 'user');
    if (lastUserMsgIndex === -1) return;

    const query = messages[lastUserMsgIndex].content;

    // Remove all messages after the last user message (essentially removing the last response(s))
    // We keep the user message so we don't need to re-add it like handleSendMessage does
    setMessages(prev => prev.slice(0, lastUserMsgIndex + 1));
    setIsLoading(true);

    try {
      const response = await ragService.query(query, 5, session.session_id, selectedDocuments, responseStyle);
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
      <div className="hidden md:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30 sticky top-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-800 truncate">
            {session?.title || "New Chat"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedDocuments.length > 0
              ? `referencing ${selectedDocuments.length} document${selectedDocuments.length === 1 ? '' : 's'}`
              : 'No documents selected'}
          </p>
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
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 pt-6 md:pt-4 pb-48 scroll-smooth relative">
        {!session ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No chat selected</h3>
            <p className="text-gray-600 max-w-md">Create a new chat or select an existing one.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a conversation</h3>
            <p className="text-gray-600 max-w-md mb-4">Ask questions about your documents.</p>
            {(!selectedDocuments || selectedDocuments.length === 0) && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
                <p className="text-sm font-medium text-blue-900">Select documents to get started</p>
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

      {/* Input Area - Fixed relative to viewport */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-linear-to-t from-white via-white to-transparent px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 pt-10">
        <div className="max-w-4xl mx-auto">
          <QueryInput
            onSend={handleSendMessage}
            disabled={isLoading || !session}
            responseStyle={responseStyle}
            onResponseStyleChange={setResponseStyle}
            onAttachClick={onAttachDocuments}
          />
        </div>
      </div>
    </div>
  );
}
