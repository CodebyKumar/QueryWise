from fastapi import APIRouter, status
from schema.query_schema import (
    DatabaseConnectionRequest,
    DatabaseConnectionResponse,
    NaturalLanguageQueryRequest,
    QueryExecutionResponse,
    SchemaResponse,
    DisconnectResponse
)
from controller.query_controller import query_controller

router = APIRouter(
    prefix="/api/query",
    tags=["Text-to-SQL Query Service"],
    responses={404: {"description": "Not found"}},
)


@router.post(
    "/connect",
    response_model=DatabaseConnectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Connect to a database"
)
async def connect_database(
    connection_request: DatabaseConnectionRequest
):
    """
    Establish a connection to a SQL database.
    
    Supports:
    - **PostgreSQL**: `postgresql://user:password@host:port/database`
    - **MySQL**: `mysql+pymysql://user:password@host:port/database`
    - **SQLite**: `sqlite:///path/to/database.db`
    
    Returns a unique `connection_id` to use for subsequent queries.
    
    **Example:**
    ```json
    {
        "connection_string": "sqlite:///./test.db"
    }
    ```
    """
    return await query_controller.connect_to_database(connection_request)


@router.post(
    "/execute",
    response_model=QueryExecutionResponse,
    summary="Execute natural language query"
)
async def execute_query(
    query_request: NaturalLanguageQueryRequest
):
    """
    Convert a natural language question to SQL and execute it.
    
    **Workflow:**
    1. Extracts database schema
    2. Sends schema + question to Gemini LLM
    3. Generates SQL query
    4. Validates SQL (security checks)
    5. Executes query
    6. Returns results
    
    **Security:**
    - Only SELECT queries allowed
    - Dangerous keywords blocked (DROP, DELETE, INSERT, UPDATE, etc.)
    - Multiple validation layers
    
    **Example:**
    ```json
    {
        "connection_id": "550e8400-e29b-41d4-a716-446655440000",
        "natural_language_query": "Show me all users created in the last 30 days"
    }
    ```
    
    **Response includes:**
    - Generated SQL query
    - Query results as list of dictionaries
    - Row count
    """
    return await query_controller.execute_natural_language_query(query_request)


@router.get(
    "/schema/{connection_id}",
    response_model=SchemaResponse,
    summary="Get database schema"
)
async def get_schema(connection_id: str):
    """
    Retrieve the complete database schema for a connection.
    
    Useful for:
    - Debugging
    - Understanding database structure
    - Verifying schema extraction
    
    Returns both raw schema (JSON) and formatted schema (human-readable).
    """
    return await query_controller.get_database_schema(connection_id)


@router.delete(
    "/disconnect/{connection_id}",
    response_model=DisconnectResponse,
    summary="Disconnect from database"
)
async def disconnect_database(connection_id: str):
    """
    Disconnect from a database and cleanup resources.
    
    Removes the connection from the connection pool and clears cached schema.
    """
    return await query_controller.disconnect_database(connection_id)


@router.get("/health", summary="Health Check")
async def query_health_check():
    """
    Simple health check endpoint to confirm the text-to-SQL service is running.
    """
    return {
        "status": "healthy",
        "service": "text-to-sql",
        "message": "Text-to-SQL query service is operational"
    }
