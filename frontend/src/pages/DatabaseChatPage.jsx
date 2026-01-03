import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { DatabaseConnectionPanel } from '../components/database/DatabaseConnectionPanel';
import { DatabaseChatInterface } from '../components/database/DatabaseChatInterface';
import databaseService from '../services/databaseService';
import { useToast } from '../hooks/useToast';
import { useDatabase } from '../hooks/useDatabase';

export function DatabaseChatPage() {
    const {
        connections,
        activeConnectionId,
        activeConnection,
        setActiveConnectionId,
        addConnection,
        removeConnection
    } = useDatabase();
    
    const [isConnecting, setIsConnecting] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

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

                addConnection(newConnection);
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
            removeConnection(connectionId);
            showToast('Database disconnected', 'success');
        } catch (error) {
            showToast('Failed to disconnect', 'error');
        }
    };

    const handleSelectConnection = (connectionId) => {
        setActiveConnectionId(connectionId);
    };

    const handleVisualize = (connectionId, databaseType) => {
        // Navigate to visualization page with connection details
        navigate(`/database-visualization?connectionId=${connectionId}&databaseType=${databaseType}`);
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
                removeConnection(connectionId);
                showToast('Connection lost. Please reconnect to the database.', 'error');
                throw new Error('Connection lost. Please reconnect to the database.');
            }

            throw new Error(errorMessage);
        }
    };

    const [showSidebar, setShowSidebar] = useState(false);

    return (
        <div className="h-dvh flex flex-col bg-white overflow-hidden">
            <Header />

            <div className="flex-1 flex overflow-hidden relative">
                {/* Mobile Drawer Overlay */}
                {showSidebar && (
                    <div
                        className="fixed inset-0 bg-gray-900/10 backdrop-blur-xs z-40 md:hidden"
                        onClick={() => setShowSidebar(false)}
                    />
                )}

                {/* Left Panel - Database Connections (Drawer on mobile) */}
                <div
                    className={`
                        fixed md:relative inset-y-0 left-0 z-50 md:z-30
                        transform transition-transform duration-300 ease-in-out
                        ${showSidebar ? "translate-x-0 overflow-hidden shadow-2xl" : "-translate-x-full md:translate-x-0"}
                        w-[280px] sm:w-80 md:w-96 flex-shrink-0 bg-white
                    `}
                >
                    <DatabaseConnectionPanel
                        connections={connections}
                        activeConnectionId={activeConnectionId}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        onSelectConnection={(id) => {
                            handleSelectConnection(id);
                            setShowSidebar(false);
                        }}
                        isConnecting={isConnecting}
                        onClose={() => setShowSidebar(false)}
                    />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden relative">
                    {/* Refined Mobile Header */}
                    <div className="md:hidden flex items-center h-14 px-4 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
                        <button
                            onClick={() => setShowSidebar(true)}
                            className="p-2 -ml-2 text-gray-400 hover:text-orange-600 transition-colors"
                            aria-label="Toggle connections"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <div className="flex-1 text-center min-w-0 px-2">
                            <h1 className="text-sm font-bold text-gray-800 truncate tracking-tight uppercase">
                                {activeConnection ? `DB: ${activeConnection.databaseType}` : "Database Chat"}
                            </h1>
                        </div>

                        {/* Placeholder for symmetry */}
                        <div className="w-8" />
                    </div>

                    {/* Chat Interface */}
                    <div className="flex-1 overflow-hidden">
                        <DatabaseChatInterface
                            activeConnection={activeConnection}
                            onExecuteQuery={handleExecuteQuery}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
