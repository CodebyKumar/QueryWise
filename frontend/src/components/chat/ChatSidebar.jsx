import { useState } from 'react';
import { DocumentUpload } from '../documents/DocumentUpload';
import { Button } from '../common/Button';

export function ChatSidebar({ 
  sessions, 
  currentSessionId, 
  onSessionSelect, 
  onNewSession,
  onDeleteSession,
  onUploadSuccess 
}) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="w-64 bg-gray-50/50 border-r border-gray-200/80 flex flex-col h-full">
      {/* Header */}
      <div className="p-3">
        <Button onClick={onNewSession} className="w-full justify-center" size="sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </Button>
      </div>

      {/* Upload Section */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100/80 rounded-md transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload
          </span>
          <svg 
            className={`w-3 h-3 transition-transform ${showUpload ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showUpload && (
          <div className="mt-2">
            <DocumentUpload 
              onUploadSuccess={() => {
                onUploadSuccess?.();
                setShowUpload(false);
              }}
              compact
            />
          </div>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
          Recent
        </div>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-xs text-gray-500">No chats yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className={`group relative px-3 py-2 rounded-md cursor-pointer transition-all ${
                  currentSessionId === session.session_id
                    ? 'bg-white shadow-sm border border-gray-200'
                    : 'hover:bg-gray-100/60'
                }`}
                onClick={() => onSessionSelect(session.session_id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate font-medium">
                      {session.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.session_id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-opacity"
                  >
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
