export function ConnectionCard({ connection, isActive, onSelect, onDisconnect, onViewSchema }) {
    const getDatabaseType = (connectionString) => {
        if (connectionString.startsWith('sqlite')) return 'SQLite';
        if (connectionString.startsWith('postgresql')) return 'PostgreSQL';
        if (connectionString.startsWith('mysql')) return 'MySQL';
        return 'Unknown';
    };

    const getDatabaseName = (connectionString) => {
        try {
            const parts = connectionString.split('/');
            return parts[parts.length - 1] || 'Database';
        } catch {
            return 'Database';
        }
    };

    const dbType = getDatabaseType(connection.connectionString);
    const dbName = getDatabaseName(connection.connectionString);

    const typeColors = {
        'SQLite': 'bg-green-100 text-green-800',
        'PostgreSQL': 'bg-blue-100 text-blue-800',
        'MySQL': 'bg-orange-100 text-orange-800',
        'Unknown': 'bg-gray-100 text-gray-800'
    };

    return (
        <div
            className={`
        p-3 rounded-lg border-2 transition-all cursor-pointer
        ${isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }
      `}
            onClick={() => onSelect(connection.id)}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div
                            className={`w-2 h-2 rounded-full ${connection.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                                }`}
                            title={connection.status === 'connected' ? 'Connected' : 'Disconnected'}
                        />
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {dbName}
                        </h4>
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${typeColors[dbType]}`}>
                        {dbType}
                    </span>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewSchema(connection.id);
                    }}
                    className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                    View Schema
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDisconnect(connection.id);
                    }}
                    className="flex-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                >
                    Disconnect
                </button>
            </div>
        </div>
    );
}
