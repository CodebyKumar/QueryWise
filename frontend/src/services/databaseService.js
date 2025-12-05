import api from './api';

/**
 * Database Service
 * Handles all database-related API calls for text-to-SQL functionality
 */

const BASE_PATH = '/api/query';

export const databaseService = {
    /**
     * Connect to a database
     * @param {string} connectionString - SQLAlchemy connection string
     * @returns {Promise} Connection response with connection_id
     */
    async connectDatabase(connectionString) {
        const response = await api.post(`${BASE_PATH}/connect`, {
            connection_string: connectionString
        });
        return response.data;
    },

    /**
     * Execute a natural language query
     * @param {string} connectionId - Connection ID from connect response
     * @param {string} naturalLanguageQuery - User's question in natural language
     * @returns {Promise} Query execution response with SQL and results
     */
    async executeQuery(connectionId, naturalLanguageQuery) {
        const response = await api.post(`${BASE_PATH}/execute`, {
            connection_id: connectionId,
            natural_language_query: naturalLanguageQuery
        });
        return response.data;
    },

    /**
     * Get database schema
     * @param {string} connectionId - Connection ID
     * @returns {Promise} Schema response with tables, columns, relationships
     */
    async getSchema(connectionId) {
        const response = await api.get(`${BASE_PATH}/schema/${connectionId}`);
        return response.data;
    },

    /**
     * Disconnect from database
     * @param {string} connectionId - Connection ID
     * @returns {Promise} Disconnect response
     */
    async disconnectDatabase(connectionId) {
        const response = await api.delete(`${BASE_PATH}/disconnect/${connectionId}`);
        return response.data;
    },

    /**
     * Health check for database service
     * @returns {Promise} Health status
     */
    async getHealth() {
        const response = await api.get(`${BASE_PATH}/health`);
        return response.data;
    }
};

export default databaseService;
