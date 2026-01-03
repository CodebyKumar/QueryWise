import { createContext, useState, useEffect } from 'react';

const DatabaseContext = createContext(null);

export { DatabaseContext };

export function DatabaseProvider({ children }) {
    const [connections, setConnections] = useState(() => {
        // Load connections from sessionStorage on mount
        const saved = sessionStorage.getItem('db_connections');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [activeConnectionId, setActiveConnectionId] = useState(() => {
        // Load active connection from sessionStorage
        return sessionStorage.getItem('active_connection_id') || null;
    });

    // Persist connections to sessionStorage whenever they change
    useEffect(() => {
        if (connections.length > 0) {
            sessionStorage.setItem('db_connections', JSON.stringify(connections));
        } else {
            sessionStorage.removeItem('db_connections');
        }
    }, [connections]);

    // Persist active connection ID
    useEffect(() => {
        if (activeConnectionId) {
            sessionStorage.setItem('active_connection_id', activeConnectionId);
        } else {
            sessionStorage.removeItem('active_connection_id');
        }
    }, [activeConnectionId]);

    const addConnection = (connection) => {
        setConnections(prev => [...prev, connection]);
        setActiveConnectionId(connection.id);
    };

    const removeConnection = (connectionId) => {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
        if (activeConnectionId === connectionId) {
            setActiveConnectionId(null);
        }
    };

    const clearConnections = () => {
        setConnections([]);
        setActiveConnectionId(null);
    };

    const activeConnection = connections.find(conn => conn.id === activeConnectionId);

    return (
        <DatabaseContext.Provider
            value={{
                connections,
                activeConnectionId,
                activeConnection,
                setActiveConnectionId,
                addConnection,
                removeConnection,
                clearConnections
            }}
        >
            {children}
        </DatabaseContext.Provider>
    );
}
