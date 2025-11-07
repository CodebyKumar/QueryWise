import { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';

export function NotesPanel({ sessionId }) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  // Load notes for current session
  useEffect(() => {
    if (sessionId) {
      const savedNotes = localStorage.getItem(`notes_${sessionId}`);
      setNotes(savedNotes || '');
    } else {
      setNotes('');
    }
  }, [sessionId]);

  const handleSave = () => {
    if (!sessionId) {
      showToast({ type: 'error', message: 'No active session' });
      return;
    }

    setIsSaving(true);
    localStorage.setItem(`notes_${sessionId}`, notes);
    
    setTimeout(() => {
      setIsSaving(false);
      showToast({ type: 'success', message: 'Notes saved' });
    }, 300);
  };

  const handleExport = () => {
    if (!notes.trim()) {
      showToast({ type: 'error', message: 'No notes to export' });
      return;
    }

    const blob = new Blob([notes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${sessionId || 'untitled'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast({ type: 'success', message: 'Notes exported' });
  };

  const handleClear = () => {
    if (window.confirm('Clear all notes? This cannot be undone.')) {
      setNotes('');
      if (sessionId) {
        localStorage.removeItem(`notes_${sessionId}`);
      }
      showToast({ type: 'success', message: 'Notes cleared' });
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Notes
          </h3>
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Clear notes"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Take notes during your conversation
        </p>
      </div>

      {/* Notes Editor */}
      <div className="flex-1 p-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Start typing your notes here...

• Key insights
• Important points
• Follow-up questions
• Summary"
          disabled={!sessionId}
          className="w-full h-full resize-none border-none focus:outline-none text-sm text-gray-700 placeholder-gray-400 font-mono leading-relaxed"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        />
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Button
          onClick={handleSave}
          disabled={!sessionId || isSaving}
          className="w-full"
          size="sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          {isSaving ? 'Saving...' : 'Save Notes'}
        </Button>
        
        <Button
          onClick={handleExport}
          disabled={!notes.trim()}
          variant="secondary"
          className="w-full"
          size="sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export as TXT
        </Button>

        <div className="text-xs text-gray-500 text-center pt-2">
          {notes.length} characters
        </div>
      </div>
    </div>
  );
}
