import { useState, useRef, useEffect } from 'react';
import { VoiceInput } from './VoiceInput';

export function QueryInput({ onSend, disabled, onExportChat, responseStyle = 'auto', onResponseStyleChange, onAttachClick }) {
  const [query, setQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const textareaRef = useRef(null);
  const exportMenuRef = useRef(null);
  const styleMenuRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
    }
  }, [query]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
      if (styleMenuRef.current && !styleMenuRef.current.contains(event.target)) {
        setShowStyleMenu(false);
      }
    };

    if (showExportMenu || showStyleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu, showStyleMenu]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !disabled) {
      onSend(query.trim());
      setQuery('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };


  const handleSearch = () => {
    // Placeholder for future search functionality
    console.log('Search functionality - coming soon');
  };

  const handleStyleChange = (style) => {
    if (onResponseStyleChange) {
      onResponseStyleChange(style);
    }
    setShowStyleMenu(false);
  };

  const getStyleIcon = (style = responseStyle) => {
    switch (style) {
      case 'detailed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      case 'concise':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h4" />
          </svg>
        );
      case 'balanced':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        );
      default: // auto
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const getStyleLabel = () => {
    const labels = {
      auto: 'Auto',
      detailed: 'Detailed',
      concise: 'Concise',
      balanced: 'Balanced'
    };
    return labels[responseStyle] || 'Auto';
  };

  return (
    <div className="w-full px-2 sm:px-4">
      <div className="relative bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
        <form onSubmit={handleSubmit}>
          {/* Textarea Area */}
          <div className="px-4 pt-2 pb-0.5">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message DocuMind..."
              disabled={disabled}
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-gray-800 placeholder-gray-400 resize-none text-[14px] leading-snug py-1 max-h-[100px] overflow-y-auto font-sans"
              style={{ minHeight: '32px' }}
            />
          </div>

          {/* Bottom Action Row */}
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              {/* Document Attachment Button (Mobile/Quick Access) */}
              <button
                type="button"
                onClick={() => onAttachClick && onAttachClick()}
                disabled={disabled}
                className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Attach Documents"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <div className="w-px h-4 bg-gray-200 mx-1"></div>

              {/* Style Selector */}
              <div className="relative" ref={styleMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowStyleMenu(!showStyleMenu)}
                  disabled={disabled}
                  className={`
                      p-1.5 pl-2 pr-3 rounded-full transition-all flex items-center gap-2 border
                      ${showStyleMenu
                      ? 'bg-orange-50 border-orange-200 text-orange-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200 hover:text-orange-600'}
                    `}
                  title={`Response Style: ${getStyleLabel()}`}
                >
                  <div className={`
                      flex items-center justify-center
                    `}>
                    {getStyleIcon()}
                  </div>
                  <span className="text-xs font-semibold">
                    {getStyleLabel()}
                  </span>
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showStyleMenu && (
                  <div className="absolute bottom-full md:bottom-full left-0 mb-2 md:mb-2 w-52 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-[60vh] overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                      Response Style
                    </div>
                    {[
                      { id: 'auto', label: 'Auto', color: 'slate', desc: 'Smarter defaults' },
                      { id: 'detailed', label: 'Detailed', color: 'green', desc: 'In-depth analysis' },
                      { id: 'balanced', label: 'Balanced', color: 'orange', desc: 'Best for general use' },
                      { id: 'concise', label: 'Concise', color: 'purple', desc: 'Short and sweet' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleStyleChange(item.id)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all
                          ${responseStyle === item.id
                            ? `bg-${item.color}-50 text-${item.color}-700 font-medium`
                            : 'text-gray-600 hover:bg-gray-50'}
                        `}
                      >
                        <div className={`
                          p-1.5 rounded-lg
                          ${responseStyle === item.id
                            ? `text-${item.color}-600 bg-${item.color}-100/50`
                            : `text-gray-400 bg-gray-50 group-hover:bg-${item.color}-50`}
                        `}>
                          {getStyleIcon(item.id)}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="capitalize">{item.label}</span>
                          <span className="text-[10px] opacity-60 font-normal leading-tight">{item.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-center gap-2">
              {/* Voice Input */}
              <VoiceInput
                onTranscribe={(text) => setQuery(prev => prev + (prev ? ' ' : '') + text)}
                disabled={disabled}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={disabled || !query.trim()}
                className={`
                  w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300
                  ${query.trim()
                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-200 active:scale-95'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
      <p className="text-[11px] text-gray-400 text-center mt-2 tracking-tight">
        DocuMind can make mistakes. Check important info.
      </p>
    </div>
  );
}
