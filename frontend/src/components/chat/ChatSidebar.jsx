import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { DocumentUpload } from '../documents/DocumentUpload';
import { DocumentSelector } from './DocumentSelector';
import { DatabaseConnectionSelector } from './DatabaseConnectionSelector';
import { Button } from '../common/Button';

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onUploadSuccess,
  selectedDocuments = [],
  onDocumentSelectionChange,
  dbConnected = false,
  onDbConnectedChange,
  onClose,
  showUpload: externalShowUpload,
  onShowUploadChange,
  onRenameSession
}) {
  const [internalShowUpload, setInternalShowUpload] = useState(false);
  const [openSection, setOpenSection] = useState({
    documents: true,
    database: true,
    history: true
  });

  // Title Editing State
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingSessionId]);

  const startEditing = (session, e) => {
    e.stopPropagation();
    setEditingSessionId(session.session_id);
    setEditTitle(session.title);
  };

  const saveTitle = async () => {
    if (!editingSessionId) return;
    if (editTitle.trim() !== "" && onRenameSession) {
      await onRenameSession(editingSessionId, editTitle);
    }
    setEditingSessionId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
    }
  };

  const navigate = useNavigate();

  const showUpload = externalShowUpload !== undefined ? externalShowUpload : internalShowUpload;

  const handleShowUploadChange = (newValue) => {
    if (onShowUploadChange) {
      onShowUploadChange(newValue);
    } else {
      setInternalShowUpload(newValue);
    }
  };

  const toggleSection = (sectionName) => {
    setOpenSection(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  return (
    <div className="w-full bg-white border-r border-gray-200 flex flex-col h-full shadow-sm select-none">
      {/* Mobile Close Button */}
      {onClose && (
        <div className="md:hidden flex justify-end p-2 border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {/* Section 1: Documents */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('documents')}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-semibold text-gray-800 hover:text-gray-900 transition-colors group"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documents
            </span>
            <div className="flex items-center gap-2">
              {selectedDocuments.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" title={`${selectedDocuments.length} active`}></span>
              )}
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSection.documents ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {openSection.documents && (
            <div className="space-y-0.5 mt-0.5">
              {/* Select Documents */}
              <DocumentSelector
                selectedDocs={selectedDocuments}
                onSelectionChange={onDocumentSelectionChange}
              />

              {/* Upload Document */}
              <div className="px-4 py-1.5">
                <button
                  onClick={() => handleShowUploadChange(!showUpload)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all border ${
                    showUpload
                      ? 'bg-orange-50/70 border border-orange-200 text-gray-900 font-medium'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                    </svg>
                    Upload New Document
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${showUpload ? 'rotate-180 text-orange-600' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUpload && (
                  <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                    <DocumentUpload
                      onUploadSuccess={() => {
                        onUploadSuccess?.();
                        handleShowUploadChange(false);
                      }}
                      compact
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Database Connection */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('database')}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-semibold text-gray-800 hover:text-gray-900 transition-colors group"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              Database Connection
            </span>
            <div className="flex items-center gap-2">
              {dbConnected && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" title="Connected"></span>
              )}
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSection.database ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {openSection.database && (
            <div className="px-4 py-2">
              <DatabaseConnectionSelector
                dbConnected={dbConnected}
                onDbConnectedChange={onDbConnectedChange}
              />
            </div>
          )}
        </div>

        {/* Section 3: Conversations */}
        <div className="py-2">
          <div className="w-full px-4 py-2 flex items-center justify-between text-sm font-semibold text-gray-800">
            <button
              onClick={() => toggleSection('history')}
              className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-gray-900 transition-colors flex-1"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Conversations</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSection.history ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Plus icon to create new chat */}
            <button
              onClick={onNewSession}
              className="p-1 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-all ml-2"
              title="Create new conversation"
              aria-label="New chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {openSection.history && (
            <div className="px-2 py-1 space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <p className="text-sm text-gray-400">No previous chats</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={`group relative rounded-lg cursor-pointer transition-all mx-1 ${currentSessionId === session.session_id
                      ? 'bg-orange-50 text-orange-900 font-semibold border border-orange-200/60'
                      : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-transparent'
                      }`}
                    onClick={() => onSessionSelect(session.session_id)}
                  >
                    <div className="px-3 py-2 flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        {editingSessionId === session.session_id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={saveTitle}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm px-1.5 py-0.5 border border-orange-400 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        ) : (
                          <p
                            onDoubleClick={(e) => startEditing(session, e)}
                            className="text-sm truncate leading-snug"
                            title="Double-click to rename"
                          >
                            {session.title}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.session_id);
                        }}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-red-100 text-red-400 hover:text-red-500 rounded transition-all shrink-0"
                        title="Delete chat"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Footer Link */}
      <div className="md:hidden p-3 border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-white rounded-lg transition-all"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Home
        </button>
      </div>
    </div>
  );
}

