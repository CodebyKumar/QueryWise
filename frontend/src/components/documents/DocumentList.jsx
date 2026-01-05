import { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { documentService } from '../../services/documentService';

export function DocumentList({ documents, onDocumentsChanged, isSelectionMode, onSelectionChange }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [selected, setSelected] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(selected.length);
  }, [selected, onSelectionChange]);

  // Reset selection when exiting selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      setSelected([]);
    }
  }, [isSelectionMode]);

  const handleDocumentClick = (idx) => {
    if (isSelectionMode) {
      handleSelect(documents[idx].filename);
    } else {
      setExpandedIndex(expandedIndex === idx ? null : idx);
    }
  };

  const handleSelect = (filename) => {
    setSelected((prev) => prev.includes(filename)
      ? prev.filter(f => f !== filename)
      : [...prev, filename]);
  };

  const handleSelectAll = () => {
    if (selected.length === documents.length) {
      setSelected([]);
    } else {
      setSelected(documents.map(doc => doc.filename));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await documentService.deleteDocuments(selected);
      setSelected([]);
      setShowConfirm(false);
      onDocumentsChanged?.();
    } catch (e) {
      alert('Failed to delete documents.');
    } finally {
      setDeleting(false);
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
        <p className="text-gray-600">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isSelectionMode && (
        <div className="sticky top-0 z-10 bg-gray-50 pb-4 flex items-center justify-between border-b border-gray-200 mb-6 bg-opacity-90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              checked={selected.length === documents.length && documents.length > 0}
              onChange={handleSelectAll}
            />
            <span className="text-sm font-medium text-gray-700">
              {selected.length === 0
                ? 'Select documents to delete'
                : `${selected.length} document${selected.length !== 1 ? 's' : ''} selected`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 border-none shadow-md shadow-red-100"
              disabled={selected.length === 0}
              onClick={() => setShowConfirm(true)}
            >
              Delete {selected.length > 0 ? `(${selected.length})` : ''}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {documents.map((doc, index) => {
          const isSelected = selected.includes(doc.filename);
          let description = doc.description;
          if (!description) {
            const autoDescription = doc.preview || doc.content || doc.metadata?.content || '';
            description = autoDescription.length > 0 ? autoDescription.slice(0, 200) + (autoDescription.length > 200 ? '...' : '') : 'No description available.';
          }

          return (
            <Card
              key={index}
              hover
              padding="sm"
              className={`transition-all relative overflow-hidden ${isSelected ? 'ring-2 ring-orange-500 border-orange-200 bg-orange-50' : 'cursor-pointer hover:border-orange-200'}`}
              onClick={() => handleDocumentClick(index)}
            >
              <div className="flex items-start gap-2 md:gap-4 min-w-0">
                {isSelectionMode && (
                  <div className="pt-2 shrink-0">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      checked={isSelected}
                      onChange={e => { e.stopPropagation(); handleSelect(doc.filename); }}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                )}
                <div className={`w-10 h-10 md:w-12 md:h-12 ${isSelected ? 'bg-orange-200' : 'bg-orange-100'} rounded-lg flex items-center justify-center shrink-0 transition-colors`}>
                  <svg className={`w-5 h-5 md:w-6 md:h-6 ${isSelected ? 'text-orange-700' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate flex-1 min-w-0">
                      {doc.title || 'Untitled Document'}
                    </h3>
                    {!isSelectionMode && (
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full shrink-0 whitespace-nowrap">
                        Indexed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 mb-2 flex-wrap">
                    {doc.filename && (
                      <span className="flex items-center gap-1 min-w-0 max-w-full">
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{doc.filename}</span>
                      </span>
                    )}
                    {doc.chunks && (
                      <span className="flex items-center gap-1 shrink-0">
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        {doc.chunks} chunks
                      </span>
                    )}
                  </div>
                  {(expandedIndex === index || isSelectionMode) && (
                    <div className={`rounded p-3 mt-2 text-xs md:text-sm text-gray-700 transition-colors break-words ${isSelected ? 'bg-orange-100/50' : 'bg-gray-50'}`}>
                      {description}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <Card className="max-w-md w-full" padding="lg">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-5 ring-8 ring-red-50">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Delete {selected.length} {selected.length === 1 ? 'Document' : 'Documents'}?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{selected.length}</span> document(s)? This will permanently remove them from your index.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-lg shadow-red-200 border-none px-8"
                onClick={handleDelete}
                loading={deleting}
              >
                Delete Forever
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
