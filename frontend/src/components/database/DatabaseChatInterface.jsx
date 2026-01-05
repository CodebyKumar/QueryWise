import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryResultsTable } from './QueryResultsTable';
import { VoiceInput } from '../rag/VoiceInput';

export function DatabaseChatInterface({ activeConnection, onExecuteQuery }) {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Clear chat when connection changes (including disconnect)
    useEffect(() => {
        setMessages([]);
        setQuery('');
    }, [activeConnection?.id]);

    const handleVisualize = () => {
        if (activeConnection) {
            navigate(`/database-visualization?connectionId=${activeConnection.id}&databaseType=${activeConnection.databaseType}`);
        }
    };

    const exampleQueries = [
        "Show me all records from the primary table",
        "Give me a summary of the most frequent entries",
        "Find the top 10 items by their numeric value",
        "Show me recent activity from the last 7 days",
        "Group the data by category and show counts",
        "Filter for all items with a specific status or tag"
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim() || !activeConnection) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: query,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        try {
            const result = await onExecuteQuery(activeConnection.id, query);

            const assistantMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: result.success ? 'Query executed successfully' : 'Query failed',
                sql: result.generated_sql,
                results: result.results,
                rowCount: result.row_count,
                error: result.error,
                success: result.success,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            // Only add error message if there's actual error content
            const errorText = error.message || 'Unknown error occurred';
            if (errorText && errorText.trim()) {
                const errorMessage = {
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: 'Error executing query',
                    error: errorText,
                    success: false,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleExampleQuery = (exampleQuery) => {
        setQuery(exampleQuery);
    };

    if (!activeConnection) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <svg
                        className="mx-auto h-16 w-16 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Database Selected</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Connect to a database to start querying with natural language
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Desktop Header - Hidden on mobile */}
            <div className="hidden md:block bg-white border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Database Chat</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Connected to: <span className="font-medium">{activeConnection.databaseType}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Visualize Button - Primary Action */}
                        <button
                            onClick={handleVisualize}
                            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                            title="Open database visualization"
                            aria-label="Open database visualization"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Visualize Database</span>
                        </button>
                        {/* Clear Chat Button - Secondary Action */}
                        <button
                            onClick={() => setMessages([])}
                            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-2"
                            title="Clear chat history"
                            aria-label="Clear chat history"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Clear</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Header - Optimized */}
            <div className="md:hidden bg-white border-b border-gray-100 px-3 py-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-semibold text-gray-900 truncate">Database Chat</h2>
                        <p className="text-xs text-gray-500 truncate">
                            {activeConnection.databaseType}
                        </p>
                    </div>
                    <button
                        onClick={() => setMessages([])}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                        title="Clear chat"
                        aria-label="Clear chat history"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
                {/* Visualize Button - Compact on Mobile */}
                <button
                    onClick={handleVisualize}
                    className="w-full px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                    aria-label="Open database visualization"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Visualize
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 pt-6 md:pt-4 pb-4">
                <div className="max-w-4xl mx-auto space-y-6 mb-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Database Assistant</h3>
                            <p className="text-sm text-gray-500 max-w-sm mb-8">
                                Ask natural language questions to query your database. QueryWise will generate and execute SQL for you.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
                                {exampleQueries.map((example, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleExampleQuery(example)}
                                        className="text-left p-4 bg-white hover:bg-blue-50/50 rounded-xl border border-gray-100 shadow-sm hover:shadow transition-all text-sm text-gray-700 group"
                                    >
                                        <span className="text-blue-500 font-bold mr-2 opacity-50 group-hover:opacity-100">?</span>
                                        "{example}"
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))
                    )}
                    {isLoading && (
                        <div className="flex items-center gap-3 text-gray-500 ml-12">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            <span className="text-xs font-medium ml-2">Generating SQL...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area - Fixed at bottom with mobile keyboard support */}
            <div className="flex-shrink-0 bg-white px-4 md:px-8 pb-safe pb-4 md:pb-6 pt-2 md:pt-4 border-t border-gray-100">
                <div className="max-w-4xl mx-auto">
                    <div className="relative bg-white border border-gray-200 rounded-[26px] shadow-lg shadow-gray-100/50 hover:shadow-xl transition-all duration-300">
                        <form onSubmit={handleSubmit}>
                            {/* Textarea Area */}
                            <div className="px-4 pt-3 pb-2">
                                <textarea
                                    ref={textareaRef}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Ask a question about your database..."
                                    disabled={isLoading}
                                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-gray-800 placeholder-gray-400 resize-none text-base md:text-[15px] leading-relaxed py-1 max-h-[150px] overflow-y-auto font-sans"
                                    style={{ minHeight: '44px' }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                />
                            </div>

                            {/* Bottom Action Row */}
                            <div className="flex items-center justify-between px-3 pb-2.5 pl-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                                        SQL
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{activeConnection.databaseType}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Voice Input */}
                                    <VoiceInput
                                        onTranscribe={(text) => setQuery(prev => prev + (prev ? ' ' : '') + text)}
                                        disabled={isLoading}
                                    />

                                    {/* Send Button */}
                                    <button
                                        type="submit"
                                        disabled={isLoading || !query.trim()}
                                        className={`
                                            w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200
                                            ${query.trim()
                                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 12h16m0 0l-4-4m4 4l-4 4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MessageBubble({ message }) {
    const [showSQL, setShowSQL] = useState(false);

    if (message.type === 'user') {
        return (
            <div className="w-full mb-6 flex justify-end">
                <div className="bg-gray-100/80 rounded-[20px] rounded-tr-sm px-5 py-2.5 max-w-[85%] sm:max-w-[75%]">
                    <p className="text-gray-900 text-[15px] leading-relaxed break-words">
                        {message.content}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mb-6 md:mb-10 group">
            <div className="flex gap-4 w-full">
                {/* Assistant Icon (Database/System) */}
                <div className="w-8 h-8 rounded-full bg-blue-50/50 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Message Content */}
                    <div className="prose max-w-none prose-p:text-gray-900 prose-p:leading-relaxed">
                        {message.success ? (
                            <>
                                <p className="mb-3 font-medium text-gray-900">
                                    {message.content}
                                </p>

                                {/* SQL Display */}
                                {message.sql && (
                                    <div className="mb-4">
                                        <button
                                            onClick={() => setShowSQL(!showSQL)}
                                            className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors mb-2"
                                        >
                                            <svg className={`w-3 h-3 transform transition-transform ${showSQL ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            {showSQL ? 'Hide SQL' : 'View Generated SQL'}
                                        </button>
                                        {showSQL && (
                                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 overflow-x-auto">
                                                <code className="text-xs text-gray-800 font-mono">
                                                    {message.sql}
                                                </code>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Results */}
                                {message.results && message.results.length > 0 ? (
                                    <div className="mt-2 overflow-hidden border border-gray-200 rounded-xl shadow-sm">
                                        <QueryResultsTable results={message.results} rowCount={message.rowCount} />
                                    </div>
                                ) : (
                                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600">
                                        No results found for this query.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-red-600 p-3 bg-red-50/50 rounded-lg border border-red-100">
                                <p className="font-semibold text-sm mb-1">Execution Error</p>
                                <p className="text-sm">{message.error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
