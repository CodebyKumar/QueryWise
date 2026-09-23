import { useState, useRef, useEffect } from 'react';
import { VoiceInput } from './VoiceInput';

export function QueryInput({ onSend, disabled, onExportChat, responseStyle = 'auto', onResponseStyleChange, onAttachClick, showDisclaimer = true, model = 'gemini-2.5-flash', onModelChange }) {
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

  const [showModelMenu, setShowModelMenu] = useState(false);
  const modelMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
      if (styleMenuRef.current && !styleMenuRef.current.contains(event.target)) {
        setShowStyleMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target)) {
        setShowModelMenu(false);
      }
    };

    if (showExportMenu || showStyleMenu || showModelMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu, showStyleMenu, showModelMenu]);

  const MODEL_OPTIONS = [
    {
      category: "Google Gemini",
      items: [
        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Fast & Versatile (Google)' },
      ]
    },
    {
      category: "Production Models (Groq)",
      items: [
        { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', desc: '280 t/s • Versatile' },
        { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', desc: '560 t/s • Instant' },
        { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B', desc: '500 t/s • High Reasoning' },
        { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B', desc: '1000 t/s • Ultra Fast' },
      ]
    },
    {
      category: "Preview Models (Groq)",
      items: [
        { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', desc: '450 t/s • Alibaba Cloud' },
        { id: 'minimaxai/minimax-m2.7', label: 'MiniMax M2.7', desc: '260 t/s • 196k Context' },
      ]
    }
  ];

  const getModelLabel = (val) => {
    for (const group of MODEL_OPTIONS) {
      const match = group.items.find(item => item.id === val);
      if (match) return match.label;
    }
    return 'Model';
  };

  const getModelIcon = (val) => {
    if (val === 'gemini-2.5-flash') {
      return (
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    }
    return (
      <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  }

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
      <div className="relative bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
        <form onSubmit={handleSubmit} className="relative flex flex-col">

          {/* Textarea Area */}
          <div className="px-4 pt-4 pb-0">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message QueryWise..."
              disabled={disabled}
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-gray-800 placeholder-gray-400 resize-none text-[15px] leading-snug py-1 max-h-[200px] overflow-y-auto font-sans"
              style={{ minHeight: '44px' }}
            />
          </div>

          {/* Unified Bottom Action Bar */}
          <div className="flex items-center justify-between px-2 pb-2 pl-3">

            {/* Left Group: Utilities + Settings */}
            <div className="flex items-center gap-1">
              {/* 1. Attachment */}
              <button
                type="button"
                onClick={() => onAttachClick && onAttachClick()}
                disabled={disabled}
                className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors order-1"
                title="Attach Documents"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              {/* 2. Voice Input */}
              <div className="order-2">
                <VoiceInput
                  onTranscribe={(text) => setQuery(prev => prev + (prev ? ' ' : '') + text)}
                  disabled={disabled}
                />
              </div>

              {/* Divider */}
              <div className="w-px h-4 bg-gray-200 mx-1 order-3 hidden sm:block"></div>

              {/* 3. Style Selector */}
              <div className="relative order-4" ref={styleMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowStyleMenu(!showStyleMenu)}
                  disabled={disabled}
                  className={`
                      flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all text-xs font-medium
                      ${showStyleMenu
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-gray-500 hover:bg-gray-100'}
                    `}
                  title={`Response Style: ${getStyleLabel()}`}
                >
                  <div className={`${showStyleMenu ? 'text-orange-500' : 'text-gray-400'}`}>
                    {getStyleIcon()}
                  </div>
                  <span className="hidden sm:inline">{getStyleLabel()}</span>
                </button>
                {showStyleMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                        <div className={`p-1.5 rounded-lg ${responseStyle === item.id ? `text-${item.color}-600 bg-${item.color}-100/50` : `text-gray-400 bg-gray-50 group-hover:bg-${item.color}-50`}`}>
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

              {/* 4. Model Selector */}
              {onModelChange && (
                <div className="relative order-5" ref={modelMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    disabled={disabled}
                    className={`
                        flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all text-xs font-medium
                        ${showModelMenu ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}
                      `}
                  >
                    {/* Icon removed as requested */}
                    <span className="hidden sm:inline truncate max-w-[80px]">
                      {getModelLabel(model)}
                    </span>
                    <svg className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showModelMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showModelMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {MODEL_OPTIONS.map((group, groupIdx) => (
                        <div key={groupIdx} className="mb-2 last:mb-0">
                          <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/70 border-y border-gray-100/60 my-1">
                            {group.category}
                          </div>
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                onModelChange(item.id);
                                setShowModelMenu(false);
                              }}
                              className={`
                                  w-full flex items-center justify-between px-3 py-2 text-sm transition-all
                                  ${model === item.id
                                  ? 'bg-blue-50/80 text-blue-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'}
                                `}
                            >
                              <div className="flex flex-col items-start min-w-0 pr-2">
                                <span className="text-xs font-semibold truncate">{item.label}</span>
                                <span className="text-[10px] opacity-65 font-normal leading-tight truncate">{item.desc}</span>
                              </div>
                              {model === item.id && (
                                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Group: Send Button */}
            <button
              type="submit"
              disabled={disabled || !query.trim()}
              className={`
                  w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ml-2
                  ${query.trim()
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-200 active:scale-95'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }
                `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>

          </div>
        </form>
      </div>
      {showDisclaimer && (
        <p className="text-[10px] text-gray-300 text-center mt-2 tracking-tight font-medium">
          QueryWise can make mistakes.
        </p>
      )}
    </div>
  );
}
