import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { DatabaseConnectionPanel } from '../components/database/DatabaseConnectionPanel';
import { DatabaseChatInterface } from '../components/database/DatabaseChatInterface';
import databaseService from '../services/databaseService';
import { useToast } from '../hooks/useToast';

export function DatabaseChatPage() {
    const [connections, setConnections] = useState([]);
    const [activeConnectionId, setActiveConnectionId] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const { showToast } = useToast();

    const handleConnect = async (connectionString) => {
        try {
            setIsConnecting(true);
            const result = await databaseService.connectDatabase(connectionString);

            if (result.success) {
                const newConnection = {
                    id: result.connection_id,
                    connectionString,
                    databaseType: result.database_type,
                    status: 'connected',
                    createdAt: new Date()
                };

                setConnections(prev => [...prev, newConnection]);
                setActiveConnectionId(result.connection_id);
                showToast('Database connected successfully', 'success');
            } else {
                showToast('Failed to connect to database', 'error');
            }
        } catch (error) {
            showToast(error.response?.data?.detail || 'Connection failed', 'error');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async (connectionId) => {
        try {
            await databaseService.disconnectDatabase(connectionId);
            setConnections(prev => prev.filter(conn => conn.id !== connectionId));

            if (activeConnectionId === connectionId) {
                setActiveConnectionId(null);
            }

            showToast('Database disconnected', 'success');
        } catch (error) {
            showToast('Failed to disconnect', 'error');
        }
    };

    const handleSelectConnection = (connectionId) => {
        setActiveConnectionId(connectionId);
    };

    const handleExecuteQuery = async (connectionId, query) => {
        try {
            const result = await databaseService.executeQuery(connectionId, query);
            return result;
        } catch (error) {
            // Check if error is due to connection not found
            const errorMessage = error.response?.data?.detail || error.message || 'Query execution failed';

            if (errorMessage.includes('No connection found') || errorMessage.includes('connection')) {
                // Connection is lost, remove it from state
                setConnections(prev => prev.filter(conn => conn.id !== connectionId));
                if (activeConnectionId === connectionId) {
                    setActiveConnectionId(null);
                }
                showToast('Connection lost. Please reconnect to the database.', 'error');
                throw new Error('Connection lost. Please reconnect to the database.');
            }

            throw new Error(errorMessage);
        }
    };

    const activeConnection = connections.find(conn => conn.id === activeConnectionId);

    return (
        <div className="h-screen flex flex-col bg-white">
            <Header />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Database Connections (30%) */}
                <div className="w-full md:w-96 flex-shrink-0">
                    <DatabaseConnectionPanel
                        connections={connections}
                        activeConnectionId={activeConnectionId}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        onSelectConnection={handleSelectConnection}
                        isConnecting={isConnecting}
                    />
                </div>

                {/* Right Panel - Chat Interface (70%) */}
                <div className="flex-1">
                    <DatabaseChatInterface
                        activeConnection={activeConnection}
                        onExecuteQuery={handleExecuteQuery}
                    />
                </div>
            </div>
        </div>
    );
}
