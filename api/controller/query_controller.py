from fastapi import HTTPException, status
from typing import Dict, Any, List
import logging
import uuid

from schema.query_schema import (
    DatabaseConnectionRequest,
    DatabaseConnectionResponse,
    NaturalLanguageQueryRequest,
    QueryExecutionResponse,
    SchemaResponse,
    DisconnectResponse
)
from service.database_service import DatabaseService
from service.sql_generation_service import sql_generation_service

logger = logging.getLogger(__name__)


class QueryController:
    """
    Controller for orchestrating text-to-SQL operations.
    Coordinates between DatabaseService and SQLGenerationService.
    """
    
    def __init__(self):
        self.database_service = DatabaseService()
        self._schema_cache: Dict[str, Dict] = {}  # Cache schemas to avoid re-extraction
    
    async def connect_to_database(
        self, 
        connection_request: DatabaseConnectionRequest
    ) -> DatabaseConnectionResponse:
        """
        Establish a connection to a database
        
        Args:
            connection_request: Database connection details
            
        Returns:
            DatabaseConnectionResponse with connection_id
            
        Raises:
            HTTPException: If connection fails
        """
        try:
            # Generate unique connection ID
            connection_id = str(uuid.uuid4())
            
            # Attempt to connect
            logger.info(f"Attempting to connect to database with ID: {connection_id}")
            success = self.database_service.connect_database(
                connection_id=connection_id,
                connection_string=connection_request.connection_string
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to establish database connection"
                )
            
            # Extract schema and cache it
            schema = self.database_service.get_logical_schema(connection_id)
            self._schema_cache[connection_id] = schema
            
            database_type = schema.get("database_type", "unknown")
            
            logger.info(f"Successfully connected to {database_type} database")
            
            return DatabaseConnectionResponse(
                success=True,
                connection_id=connection_id,
                database_type=database_type,
                message=f"Successfully connected to {database_type} database"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Database connection failed: {str(e)}"
            )
    
    async def execute_natural_language_query(
        self,
        query_request: NaturalLanguageQueryRequest
    ) -> QueryExecutionResponse:
        """
        Execute a natural language query by converting it to SQL
        
        This orchestrates the full workflow:
        1. Retrieve cached schema (or extract if not cached)
        2. Format schema for LLM
        3. Generate SQL using Gemini
        4. Validate SQL
        5. Execute query
        6. Return results
        
        Args:
            query_request: Natural language query details
            
        Returns:
            QueryExecutionResponse with results
            
        Raises:
            HTTPException: If any step fails
        """
        connection_id = query_request.connection_id
        nl_query = query_request.natural_language_query
        
        try:
            # Step 1: Get schema (from cache or extract)
            logger.info(f"Processing query for connection: {connection_id}")
            
            if connection_id not in self._schema_cache:
                logger.info("Schema not cached, extracting from database")
                schema = self.database_service.get_logical_schema(connection_id)
                self._schema_cache[connection_id] = schema
            else:
                schema = self._schema_cache[connection_id]
                logger.info("Using cached schema")
            
            # Step 2: Format schema for LLM
            formatted_schema = self.database_service.format_schema_for_llm(schema)
            
            # Step 3: Generate SQL using Gemini
            logger.info(f"Generating SQL for: {nl_query}")
            generated_sql = await sql_generation_service.generate_sql(
                natural_language_query=nl_query,
                formatted_schema=formatted_schema
            )
            
            # Step 4: Execute query (validation happens inside execute_query)
            logger.info(f"Executing SQL: {generated_sql}")
            results = self.database_service.execute_query(
                connection_id=connection_id,
                sql_query=generated_sql
            )
            
            # Step 5: Return results
            row_count = len(results)
            logger.info(f"Query executed successfully, returned {row_count} rows")
            
            return QueryExecutionResponse(
                success=True,
                generated_sql=generated_sql,
                results=results,
                row_count=row_count
            )
            
        except HTTPException:
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Query execution failed: {error_msg}")
            
            # Return error response instead of raising exception
            return QueryExecutionResponse(
                success=False,
                generated_sql=None,
                results=None,
                row_count=None,
                error=error_msg
            )
    
    async def get_database_schema(
        self,
        connection_id: str
    ) -> SchemaResponse:
        """
        Retrieve the database schema for debugging/inspection
        
        Args:
            connection_id: Database connection ID
            
        Returns:
            SchemaResponse with schema details
            
        Raises:
            HTTPException: If schema extraction fails
        """
        try:
            # Get schema (from cache or extract)
            if connection_id not in self._schema_cache:
                schema = self.database_service.get_logical_schema(connection_id)
                self._schema_cache[connection_id] = schema
            else:
                schema = self._schema_cache[connection_id]
            
            # Format for human readability
            formatted_schema = self.database_service.format_schema_for_llm(schema)
            
            return SchemaResponse(
                success=True,
                database_type=schema.get("database_type", "unknown"),
                database_schema=schema,
                formatted_schema=formatted_schema
            )
            
        except Exception as e:
            logger.error(f"Schema extraction failed: {str(e)}")
            return SchemaResponse(
                success=False,
                database_type="unknown",
                database_schema=None,
                formatted_schema=None,
                error=str(e)
            )
    
    async def disconnect_database(
        self,
        connection_id: str
    ) -> DisconnectResponse:
        """
        Disconnect from a database and cleanup resources
        
        Args:
            connection_id: Database connection ID
            
        Returns:
            DisconnectResponse
        """
        try:
            # Remove from cache
            if connection_id in self._schema_cache:
                del self._schema_cache[connection_id]
            
            # Disconnect
            success = self.database_service.disconnect_database(connection_id)
            
            if success:
                logger.info(f"Successfully disconnected: {connection_id}")
                return DisconnectResponse(
                    success=True,
                    message="Database disconnected successfully"
                )
            else:
                return DisconnectResponse(
                    success=False,
                    message="Connection not found or already disconnected"
                )
                
        except Exception as e:
            logger.error(f"Disconnect failed: {str(e)}")
            return DisconnectResponse(
                success=False,
                message=f"Disconnect failed: {str(e)}"
            )


# Singleton instance
query_controller = QueryController()
