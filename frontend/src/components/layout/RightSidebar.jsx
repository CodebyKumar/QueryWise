import { useState } from "react";
import { NotesPanel } from "../notes/NotesPanel";

export function RightSidebar({
  sessionId,
  selectedDocuments = [],
  allDocuments = [],
  dbConnected = false,
  onClose,
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Derive valid active documents with titles
  const validActiveDocs = allDocuments.filter((doc) =>
    selectedDocuments.includes(doc.filename)
  );

  return (
    <div className="bg-white border-l border-gray-200 flex flex-col h-full shadow-sm select-none">
      {/* Header */}
      <div
        className="h-[73px] px-4 border-b border-gray-200 flex items-center justify-between shrink-0"
        style={{ background: "linear-gradient(to bottom, rgb(249 250 251), white)" }}
      >
        <div className="flex items-center gap-2 flex-1">
          <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-sm font-semibold text-gray-800 tracking-tight">Context & Notes</span>
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Main Sidebar Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Section 1: Active Documents Card with Border */}
        <div className="border border-orange-200/80 bg-orange-50/40 rounded-xl p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-orange-200/60">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-bold text-orange-900">Active Documents</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
              {validActiveDocs.length} Selected
            </span>
          </div>

          {validActiveDocs.length > 0 ? (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
              {validActiveDocs.map((doc, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-orange-200 rounded-lg p-2 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <svg className="w-3.5 h-3.5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-800 truncate" title={doc.title || doc.filename}>
                      {doc.title || doc.filename}
                    </span>
                  </div>
                  {doc.chunks && (
                    <span className="text-[10px] text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 font-mono shrink-0">
                      {doc.chunks} ch
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-orange-800/70 italic py-1">No documents attached to current query</p>
          )}
        </div>

        {/* Section 2: Database Pipeline Status Card with Border */}
        <div
          className={`rounded-xl p-3 transition-all ${
            dbConnected
              ? "border-2 border-blue-400 bg-blue-50/70 shadow-2xs"
              : "border border-slate-200 bg-slate-50/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 ${dbConnected ? "text-blue-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <span className={`text-xs font-bold ${dbConnected ? "text-blue-900" : "text-slate-700"}`}>
                Database Pipeline
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                dbConnected
                  ? "bg-blue-100 text-blue-800 border-blue-300"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dbConnected ? "bg-blue-600 animate-pulse" : "bg-slate-400"}`}></span>
              {dbConnected ? "Active" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Section 3: Notes Panel Card with Border */}
        <div className="border border-gray-200 bg-white rounded-xl p-3 shadow-2xs">
          <NotesPanel sessionId={sessionId} isExpanded={isExpanded} hideHeader={false} />
        </div>
      </div>
    </div>
  );
}
