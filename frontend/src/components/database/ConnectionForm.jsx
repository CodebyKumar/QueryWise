import { useState } from 'react';

export function ConnectionForm({ onConnect, isLoading }) {
    const [connectionString, setConnectionString] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);

    const templates = [
        {
            name: 'SQLite (Test Database)',
            value: 'sqlite:///../test_ecommerce.db',
            description: 'Test e-commerce database in project root'
        },
        {
            name: 'SQLite (Absolute Path)',
            value: 'sqlite:////absolute/path/to/database.db',
            description: 'SQLite with absolute path'
        },
        {
            name: 'PostgreSQL',
            value: 'postgresql://user:password@localhost:5432/dbname',
            description: 'PostgreSQL database'
        },
        {
            name: 'MySQL',
            value: 'mysql+pymysql://user:password@localhost:3306/dbname',
            description: 'MySQL database'
        }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (connectionString.trim()) {
            await onConnect(connectionString);
        }
    };

    const useTemplate = (template) => {
        setConnectionString(template);
        setShowTemplates(false);
    };

    return (
        <div className="bg-white border-b border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
                New Connection
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Connection String
                    </label>
                    <input
                        type="text"
                        value={connectionString}
                        onChange={(e) => setConnectionString(e.target.value)}
                        placeholder="sqlite:///../test_ecommerce.db"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                    />
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                        {showTemplates ? '▼' : '▶'} Quick Templates
                    </button>

                    {showTemplates && (
                        <div className="mt-2 space-y-2">
                            {templates.map((template, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => useTemplate(template.value)}
                                    className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
                                >
                                    <div className="text-xs font-medium text-gray-900">
                                        {template.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {template.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !connectionString.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connecting...
                        </span>
                    ) : (
                        'Connect'
                    )}
                </button>
            </form>
        </div>
    );
}
