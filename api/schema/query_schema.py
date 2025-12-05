from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class DatabaseConnectionRequest(BaseModel):
    """Schema for database connection request"""
    connection_string: str = Field(
        ..., 
        description="SQLAlchemy connection string (e.g., postgresql://user:pass@host:port/dbname, sqlite:///path/to/db.sqlite)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "connection_string": "sqlite:///./test.db"
            }
        }


class DatabaseConnectionResponse(BaseModel):
    """Schema for database connection response"""
    success: bool = Field(..., description="Whether the connection was successful")
    connection_id: str = Field(..., description="Unique identifier for this database connection")
    database_type: str = Field(..., description="Type of database (postgresql, mysql, sqlite, etc.)")
    message: str = Field(..., description="Success or error message")


class NaturalLanguageQueryRequest(BaseModel):
    """Schema for natural language query request"""
    connection_id: str = Field(..., description="The connection ID from the connect endpoint")
    natural_language_query: str = Field(
        ..., 
        description="Your question in natural language (e.g., 'Show me all users from last month')"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "connection_id": "550e8400-e29b-41d4-a716-446655440000",
                "natural_language_query": "Show me the top 10 customers by total order value"
            }
        }


class QueryExecutionResponse(BaseModel):
    """Schema for query execution response"""
    success: bool = Field(..., description="Whether the query executed successfully")
    generated_sql: Optional[str] = Field(None, description="The SQL query generated from natural language")
    results: Optional[List[Dict[str, Any]]] = Field(None, description="Query results as list of dictionaries")
    row_count: Optional[int] = Field(None, description="Number of rows returned")
    error: Optional[str] = Field(None, description="Error message if query failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "generated_sql": "SELECT * FROM users WHERE created_at >= DATE('now', '-1 month')",
                "results": [
                    {"id": 1, "name": "John Doe", "email": "john@example.com"},
                    {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
                ],
                "row_count": 2
            }
        }


class SchemaResponse(BaseModel):
    """Schema for database schema response"""
    success: bool = Field(..., description="Whether schema extraction was successful")
    database_type: str = Field(..., description="Type of database")
    database_schema: Optional[Dict[str, Any]] = Field(None, description="Complete database schema")
    formatted_schema: Optional[str] = Field(None, description="Human-readable formatted schema")
    error: Optional[str] = Field(None, description="Error message if schema extraction failed")


class DisconnectResponse(BaseModel):
    """Schema for disconnect response"""
    success: bool = Field(..., description="Whether disconnection was successful")
    message: str = Field(..., description="Success or error message")
