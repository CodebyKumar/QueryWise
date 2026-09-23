import { useState, useEffect } from 'react';
import { databaseService } from '../../services/databaseService';
import { useToast } from '../../hooks/useToast';

export function DatabaseConnectionSelector({ dbConnected, onDbConnectedChange, onConnectionChange }) {
  const [connectionString, setConnectionString] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [savedConnections, setSavedConnections] = useState([]);
  const [activeConnString, setActiveConnString] = useState(() => {
    return localStorage.getItem('active_db_connection_string') || null;
  });
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const { showToast } = useToast();

  // Load saved connections from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('saved_db_connections');
      if (stored) {
        setSavedConnections(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load saved DB connections:', err);
    }
  }, []);

  const saveConnectionsToStorage = (conns) => {
    setSavedConnections(conns);
    localStorage.setItem('saved_db_connections', JSON.stringify(conns));
  };

  const handleConnectNew = async (e) => {
    e?.preventDefault();
    const str = connectionString.trim();
    if (!str) {
      showToast({ type: 'warning', message: 'Please enter a valid connection string' });
      return;
    }

    setLoading(true);
    try {
      const res = await databaseService.connectDatabase(str);
      if (res && res.success) {
        const connId = res.connection_id;
        const dbType = res.database_type || 'Database';
        const label = connectionName.trim() || `${dbType} (${str.slice(0, 18)}...)`;

        const newConn = {
          id: connId,
          name: label,
          connectionString: str,
          databaseType: dbType,
          connectedAt: new Date().toISOString()
        };

        const updated = [newConn, ...savedConnections.filter(c => c.connectionString !== str)];
        saveConnectionsToStorage(updated);

        setActiveConnString(str);
        localStorage.setItem('active_db_connection_string', str);
        if (onConnectionChange) onConnectionChange(connId);
        if (onDbConnectedChange) onDbConnectedChange(true);

        showToast({ type: 'success', message: `Connected to ${label}` });
        setConnectionString('');
        setConnectionName('');
        setShowAddForm(false);
      } else {
        throw new Error(res?.message || 'Connection failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to connect to database';
      showToast({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnection = async (conn, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const isActive = dbConnected && activeConnString === conn.connectionString;

    if (isActive) {
      // Disconnect
      setActiveConnString(null);
      localStorage.removeItem('active_db_connection_string');
      if (onConnectionChange) onConnectionChange(null);
      if (onDbConnectedChange) onDbConnectedChange(false);
      showToast({ type: 'info', message: `Disconnected from ${conn.name}` });
      return;
    }

    // Connect
    setLoading(true);
    try {
      const res = await databaseService.connectDatabase(conn.connectionString);
      if (res && res.success) {
        const connId = res.connection_id || conn.id;
        setActiveConnString(conn.connectionString);
        localStorage.setItem('active_db_connection_string', conn.connectionString);
        if (onConnectionChange) onConnectionChange(connId);
        if (onDbConnectedChange) onDbConnectedChange(true);
        showToast({ type: 'success', message: `Connected to ${conn.name}` });
      } else {
        throw new Error(res?.message || 'Connection failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to connect';
      showToast({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSaved = (e, connId, connStr) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = savedConnections.filter(c => c.id !== connId);
    saveConnectionsToStorage(updated);

    if (activeConnString === connStr) {
      setActiveConnString(null);
      localStorage.removeItem('active_db_connection_string');
      if (onDbConnectedChange) onDbConnectedChange(false);
    }
    showToast({ type: 'success', message: 'Connection removed' });
  };

  return (
    <div className="space-y-2">
      {/* Database Connections List with Checkboxes */}
      {savedConnections.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <p className="text-sm font-semibold text-gray-700 px-1">Database Connections</p>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {savedConnections.map((conn) => {
              const isActive = dbConnected && activeConnString === conn.connectionString;
              return (
                <div
                  key={conn.id || conn.connectionString}
                  onClick={(e) => handleToggleConnection(conn, e)}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-sm cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-blue-50/90 border border-blue-400 text-blue-900 font-medium'
                      : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 shrink-0 cursor-pointer"
                    />
                    <div className="truncate">
                      <p className="truncate font-medium text-sm text-gray-800">{conn.name}</p>
                      <p className="text-xs text-gray-500 truncate font-mono mt-0.5">{conn.connectionString}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSaved(e, conn.id, conn.connectionString)}
                    className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors ml-1 shrink-0"
                    title="Delete connection"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <p className="text-sm text-slate-500">No database connected</p>
        </div>
      )}

      {/* Connect New Database Toggle Button */}
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50/80 rounded-lg border border-blue-200/80 transition-all mt-1"
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Connect Database String
        </span>
        <svg
          className={`w-3.5 h-3.5 text-blue-400 transition-transform ${showAddForm ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Direct Connection String Input Form */}
      {showAddForm && (
        <form onSubmit={handleConnectNew} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2.5 shadow-sm mt-1 animate-in fade-in duration-200">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Connection Label (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Production Postgres"
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Connection String
            </label>
            <textarea
              rows={2}
              placeholder="sqlite:///app.db or postgresql://user:pass@localhost:5432/dbname"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
              required
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Connecting...
                </>
              ) : (
                'Connect DB'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
