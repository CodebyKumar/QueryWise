import { useState } from 'react';

export function QueryResultsTable({ results, rowCount }) {
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 50;

    if (!results || results.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No results to display
            </div>
        );
    }

    const columns = Object.keys(results[0]);
    const totalPages = Math.ceil(results.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentResults = results.slice(startIndex, endIndex);

    const exportToCSV = () => {
        const csv = [
            columns.join(','),
            ...results.map(row => columns.map(col => JSON.stringify(row[col] ?? '')).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query_results_${new Date().getTime()}.csv`;
        a.click();
    };

    const exportToJSON = () => {
        const json = JSON.stringify(results, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query_results_${new Date().getTime()}.json`;
        a.click();
    };

    return (
        <div className="space-y-4 p-4">
            {/* Header with row count and export buttons */}
            <div className="flex items-center justify-between gap-4">
                <div className="text-xs md:text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{rowCount}</span> row{rowCount !== 1 ? 's' : ''} returned
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={exportToCSV}
                        className="px-3 py-1.5 text-[10px] md:text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all uppercase tracking-tighter"
                    >
                        CSV
                    </button>
                    <button
                        onClick={exportToJSON}
                        className="px-3 py-1.5 text-[10px] md:text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all uppercase tracking-tighter"
                    >
                        JSON
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column}
                                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentResults.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                                {columns.map((column) => (
                                    <td
                                        key={column}
                                        className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                                    >
                                        {row[column] !== null && row[column] !== undefined
                                            ? String(row[column])
                                            : <span className="text-gray-400 italic">null</span>
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Showing {startIndex + 1} to {Math.min(endIndex, results.length)} of {results.length}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
