import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { DocumentUpload } from '../documents/DocumentUpload';
import { DocumentSelector } from './DocumentSelector';
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
  onClose,
  showUpload: externalShowUpload,
  onShowUploadChange
}) {
  const [internalShowUpload, setInternalShowUpload] = useState(false);
  const navigate = useNavigate();

  const showUpload = externalShowUpload !== undefined ? externalShowUpload : internalShowUpload;

  const handleShowUploadChange = (newValue) => {
    if (onShowUploadChange) {
      onShowUploadChange(newValue);
    } else {
      setInternalShowUpload(newValue);
    }
  };

  return (
    <div className="w-full bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
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

      {/* Header */}
      <div className="p-4 border-b border-gray-200" style={{ background: 'linear-gradient(to bottom, rgb(249 250 251), white)' }}>
        <Button
          onClick={onNewSession}
          className="w-full justify-center shadow-sm hover:shadow-md transition-shadow"
          size="sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </Button>
      </div>

      {/* Document Selector */}
      <DocumentSelector
        selectedDocs={selectedDocuments}
        onSelectionChange={onDocumentSelectionChange}
      />

      {/* Upload Section */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/30">
        <button
          onClick={() => handleShowUploadChange(!showUpload)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-gray-200"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Document
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showUpload ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showUpload && (
          <div className="mt-3">
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

      {/* Sessions List - Google AI Studio Style */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sessions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No chats yet</p>
            <p className="text-xs text-gray-500">Start a new conversation</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className={`group relative rounded-lg cursor-pointer transition-all mx-2 mb-1 ${currentSessionId === session.session_id
                  ? 'bg-gray-200/60 text-gray-900'
                  : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                  }`}
                onClick={() => onSessionSelect(session.session_id)}
              >
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    {/* Chat Title */}
                    <p className={`text-sm truncate font-medium leading-tight ${currentSessionId === session.session_id
                      ? 'font-semibold'
                      : 'font-normal'
                      }`}>
                      {session.title}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.session_id);
                    }}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 hover:bg-red-100 text-red-400 hover:text-red-500 rounded-lg transition-all shrink-0"
                    title="Delete chat"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Navigation Links */}
      <div className="md:hidden p-4 border-t border-gray-200 bg-gray-50 space-y-1">



        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Home
        </button>
      </div>
    </div>
  );
}
