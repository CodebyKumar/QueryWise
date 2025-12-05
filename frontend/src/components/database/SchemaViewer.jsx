import { useState, useEffect } from 'react';
import databaseService from '../../services/databaseService';

export function SchemaViewer({ connectionId, onClose }) {
    const [schema, setSchema] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadSchema();
    }, [connectionId]);

    const loadSchema = async () => {
        try {
            setIsLoading(true);
            const result = await databaseService.getSchema(connectionId);
            if (result.success) {
                setSchema(result);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message || 'Failed to load schema');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900">Database Schema</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-600">{error}</p>
                        </div>
                    ) : schema && schema.database_schema ? (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Database Type:</span> {schema.database_type}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">Tables:</span> {schema.database_schema.tables?.length || 0}
                                </p>
                            </div>

                            {schema.database_schema.tables?.map((table, index) => (
                                <TableCard key={index} table={table} />
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function TableCard({ table }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-gray-900">{table.table_name}</span>
                    <span className="text-xs text-gray-500">({table.columns?.length || 0} columns)</span>
                </div>
                <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                    {/* Columns */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Columns</h4>
                        <div className="space-y-2">
                            {table.columns?.map((column, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-gray-900">{column.name}</span>
                                        {table.primary_keys?.includes(column.name) && (
                                            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">PK</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-600">{column.type}</span>
                                        <span className={`text-xs ${column.nullable ? 'text-gray-500' : 'text-red-600'}`}>
                                            {column.nullable ? 'NULL' : 'NOT NULL'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Foreign Keys */}
                    {table.foreign_keys && table.foreign_keys.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Foreign Keys</h4>
                            <div className="space-y-2">
                                {table.foreign_keys.map((fk, index) => (
                                    <div key={index} className="p-2 bg-white rounded border border-gray-200 text-sm">
                                        <span className="font-mono text-gray-900">{fk.constrained_columns.join(', ')}</span>
                                        <span className="text-gray-500 mx-2">→</span>
                                        <span className="font-mono text-blue-600">{fk.referred_table}</span>
                                        <span className="text-gray-500">({fk.referred_columns.join(', ')})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
