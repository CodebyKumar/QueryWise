import { useState } from 'react';
import { SourceCard } from './SourceCard';

export function MessageBubble({ type, content, sources = [], timestamp }) {
  const [showSources, setShowSources] = useState(false);

  if (type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-gray-100 rounded-lg px-4 py-2.5 max-w-2xl">
          <p className="text-gray-900 text-sm leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white rounded-lg px-4 py-3 border border-gray-100">
        <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        
        {sources && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {sources.length} source{sources.length > 1 ? 's' : ''}
              <svg 
                className={`w-3 h-3 transition-transform ${showSources ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {showSources && sources && sources.length > 0 && (
        <div className="space-y-2 ml-4">
          {sources.map((source, index) => (
            <SourceCard key={source.id || index} {...source} />
          ))}
        </div>
      )}
    </div>
  );
}
