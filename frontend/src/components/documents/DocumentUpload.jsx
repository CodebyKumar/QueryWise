import { useState, useRef } from 'react';
import { documentService } from '../../services/documentService';
import { useToast } from '../../hooks/useToast';
import { Button } from '../common/Button';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '../../utils/constants';

export function DocumentUpload({ onUploadSuccess, compact = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const validateFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(ext)) {
      showToast({ type: 'error', message: `File type ${ext} not supported` });
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast({ type: 'error', message: 'File size exceeds 10MB limit' });
      return false;
    }
    return true;
  };

  const handleUpload = async (file) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setProgress(0);

    try {
      const response = await documentService.uploadFile(file, setProgress);
      
      // Track the uploaded document
      documentService.addDocument({
        title: file.name.split('.')[0],
        filename: file.name,
        size: file.size,
        type: file.type,
        chunks: 'Unknown', // Backend doesn't return this info
        preview: response.message || 'Document indexed successfully'
      });
      
      showToast({ type: 'success', message: 'Document uploaded and indexed successfully!' });
      onUploadSuccess?.();
    } catch (error) {
      showToast({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Upload failed' 
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])}
          className="hidden"
        />
        
        {uploading && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 text-center">{progress}%</p>
          </div>
        )}
        
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={uploading}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Choose File
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          PDF, DOCX, HTML, MD, TXT
        </p>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_FILE_TYPES.join(',')}
        onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])}
        className="hidden"
      />
      
      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {uploading ? 'Uploading...' : 'Upload Document'}
      </h3>
      <p className="text-gray-600 mb-4">
        Drag and drop or click to browse
      </p>
      
      {uploading && (
        <div className="w-full max-w-xs mx-auto mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">{progress}%</p>
        </div>
      )}
      
      <Button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={uploading}
        variant="secondary"
      >
        Choose File
      </Button>
      
      <p className="text-xs text-gray-500 mt-4">
        Supported: PDF, DOCX, HTML, MD, TXT (Max 10MB)
      </p>
    </div>
  );
}
