import { useState } from 'react';
import { ConnectionForm } from './ConnectionForm';
import { ConnectionCard } from './ConnectionCard';
import { SchemaViewer } from './SchemaViewer';

export function DatabaseConnectionPanel({
    connections,
    activeConnectionId,
    onConnect,
    onDisconnect,
    onSelectConnection,
    isConnecting,
    onClose // New prop
}) {
    const [showSchemaViewer, setShowSchemaViewer] = useState(false);
    const [selectedConnectionForSchema, setSelectedConnectionForSchema] = useState(null);

    const handleViewSchema = (connectionId) => {
        setSelectedConnectionForSchema(connectionId);
        setShowSchemaViewer(true);
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Database Connections</h2>
                        <p className="text-xs text-gray-500 mt-1">Manage your database connections</p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            aria-label="Close connections"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Connection Form */}
            <ConnectionForm onConnect={onConnect} isLoading={isConnecting} />

            {/* Connections List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {connections.length === 0 ? (
                    <div className="text-center py-12">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No connections</h3>
                        <p className="mt-1 text-xs text-gray-500">
                            Get started by connecting to a database above
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                            Active Connections ({connections.length})
                        </div>
                        {connections.map((connection) => (
                            <ConnectionCard
                                key={connection.id}
                                connection={connection}
                                isActive={connection.id === activeConnectionId}
                                onSelect={onSelectConnection}
                                onDisconnect={onDisconnect}
                                onViewSchema={handleViewSchema}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Schema Viewer Modal */}
            {showSchemaViewer && selectedConnectionForSchema && (
                <SchemaViewer
                    connectionId={selectedConnectionForSchema}
                    onClose={() => {
                        setShowSchemaViewer(false);
                        setSelectedConnectionForSchema(null);
                    }}
                />
            )}
        </div>
    );
}
