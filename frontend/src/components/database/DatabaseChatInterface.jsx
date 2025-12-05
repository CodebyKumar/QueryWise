import { useState, useRef, useEffect } from 'react';
import { QueryResultsTable } from './QueryResultsTable';

export function DatabaseChatInterface({ activeConnection, onExecuteQuery }) {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

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

    const exampleQueries = [
        "Show me all customers",
        "What are the top 5 products by price?",
        "Show me all orders from the last 30 days",
        "Which customer has the highest total spending?",
        "How many orders are in 'Delivered' status?",
        "Show me all products in the Electronics category"
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

    const useExampleQuery = (exampleQuery) => {
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
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Database Chat</h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Connected to: <span className="font-medium">{activeConnection.databaseType}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMessages([])}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                            title="Clear chat history"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear Chat
                        </button>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${activeConnection.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                            <span className="text-xs text-gray-600">
                                {activeConnection.status === 'connected' ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>            </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-12">
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Try asking a question</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                            {exampleQueries.map((example, index) => (
                                <button
                                    key={index}
                                    onClick={() => useExampleQuery(example)}
                                    className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-sm text-gray-700"
                                >
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
                    <div className="flex items-center gap-2 text-gray-500">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">Generating SQL and executing query...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask a question about your database..."
                        rows={2}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        disabled={isLoading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
                <p className="text-xs text-gray-500 mt-2">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}

function MessageBubble({ message }) {
    const [showSQL, setShowSQL] = useState(false);

    if (message.type === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-3xl bg-blue-600 text-white rounded-lg px-4 py-3">
                    <p className="text-sm">{message.content}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-start">
            <div className="max-w-4xl w-full bg-gray-100 rounded-lg p-4 space-y-3">
                {message.success ? (
                    <>
                        {/* SQL Display */}
                        {message.sql && (
                            <div>
                                <button
                                    onClick={() => setShowSQL(!showSQL)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                >
                                    <svg className={`w-4 h-4 transform transition-transform ${showSQL ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    Generated SQL
                                </button>
                                {showSQL && (
                                    <pre className="mt-2 p-3 bg-gray-800 text-green-400 rounded text-xs overflow-x-auto">
                                        {message.sql}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Results */}
                        {message.results && message.results.length > 0 && (
                            <QueryResultsTable results={message.results} rowCount={message.rowCount} />
                        )}
                    </>
                ) : (
                    <div className="text-red-600">
                        <p className="font-medium">Error:</p>
                        <p className="text-sm mt-1">{message.error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
