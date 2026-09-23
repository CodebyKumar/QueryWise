import { useState, useEffect } from 'react';
import { documentService } from '../../services/documentService';

export function DocumentSelector({ selectedDocs, onSelectionChange }) {
  const [documents, setDocuments] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await documentService.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (docId) => {
    const newSelection = selectedDocs.includes(docId)
      ? selectedDocs.filter(id => id !== docId)
      : [...selectedDocs, docId];
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(documents.map(doc => doc.filename));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-4 py-1.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all border ${
          isExpanded
            ? 'bg-orange-50/70 border border-orange-200 text-gray-900 font-medium'
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Select Documents</span>
          {selectedDocs.filter(id => documents.some(d => d.filename === id)).length > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" title={`${selectedDocs.length} selected`}></span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180 text-orange-600' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2 bg-white rounded-lg p-3 border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-500">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-4">
              <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-500">No documents uploaded</p>
            </div>
          ) : (
            <>
              {/* Search Box */}
              <div className="mb-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 pl-9 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 p-0.5 hover:bg-gray-100 rounded"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pb-2 border-b border-gray-100">
                <button
                  onClick={selectAll}
                  className="flex-1 text-sm px-3 py-1.5 font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                >
                  Select All
                </button>
                <button
                  onClick={clearAll}
                  className="flex-1 text-sm px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
                >
                  Clear
                </button>
              </div>

              {filteredDocuments.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No documents found</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                  {filteredDocuments.map((doc) => (
                    <label
                      key={doc.filename}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all border ${selectedDocs.includes(doc.filename)
                          ? 'bg-blue-50/80 border-blue-300'
                          : 'hover:bg-gray-50 border-gray-200'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.filename)}
                        onChange={() => toggleDocument(doc.filename)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            {doc.chunks} chunks
                          </span>
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
