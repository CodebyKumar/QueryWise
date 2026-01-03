"""
API Routes for Database Visualization

Provides endpoints for extracting visualization metadata from any connected SQL database.
Database-agnostic design - works with PostgreSQL, MySQL, SQLite, etc.
"""

from fastapi import APIRouter, status, HTTPException
from schema.visualization_schema import (
    DatabaseVisualizationRequest,
    DatabaseVisualizationResponse,
    CustomVisualizationRequest,
    CustomVisualizationResponse
)
import service.features.database_visualization_service as viz_module

router = APIRouter(
    prefix="/api/visualization",
    tags=["Database Visualization"],
    responses={404: {"description": "Not found"}},
)


@router.post(
    "/metadata",
    response_model=DatabaseVisualizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get database visualization metadata"
)
async def get_visualization_metadata(
    request: DatabaseVisualizationRequest
):
    """
    Extract visualization metadata from a connected database.
    
    This endpoint provides:
    - Complete schema information for all tables
    - Row counts per table
    - Column data types and categories
    - Statistical summaries for numeric columns
    - Auto-generated chart configurations (rule-based, no ML)
    
    **Works with ANY SQL database connection** (not Supabase-specific).
    
    **Request:**
    ```json
    {
        "connection_id": "abc-123-xyz",
        "include_statistics": true,
        "max_tables": 10
    }
    ```
    
    **Response includes:**
    - Database metadata (tables, columns, types)
    - Statistical summaries (row counts, numeric stats)
    - Suggested chart configurations ready for frontend rendering
    
    **Design notes:**
    - Uses only safe, deterministic SQL (COUNT, SUM, AVG, MIN, MAX)
    - No LLM-generated queries
    - No automatic join detection
    - Rule-based chart generation only
    """
    if not viz_module.database_visualization_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Visualization service not initialized"
        )
    
    # Await the async method
    result = await viz_module.database_visualization_service.get_database_visualization_metadata(
        connection_id=request.connection_id,
        include_statistics=request.include_statistics,
        max_tables=request.max_tables
    )
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error or "Failed to get visualization metadata"
        )
    
    return result


@router.post(
    "/custom",
    response_model=CustomVisualizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate custom visualization"
)
async def generate_custom_visualization(
    request: CustomVisualizationRequest
):
    """
    Generate a custom visualization based on user-specified parameters.
    
    User can specify:
    - **table_name**: Which table to query
    - **dimension_column**: Column for grouping/categories (optional)
    - **metric_column**: Column to aggregate (must be numeric)
    - **aggregation**: Function to apply (count, sum, avg, min, max)
    - **chart_type**: Desired chart type (bar, line, pie)
    - **limit**: Max number of data points
    - **order_by**: Sort order (asc/desc)
    
    **Example request:**
    ```json
    {
        "connection_id": "abc-123",
        "table_name": "orders",
        "dimension_column": "status",
        "metric_column": "total_amount",
        "aggregation": "sum",
        "chart_type": "bar",
        "limit": 20,
        "order_by": "desc"
    }
    ```
    
    This generates SQL like:
    ```sql
    SELECT status, SUM(total_amount) as value
    FROM orders
    GROUP BY status
    ORDER BY value DESC
    LIMIT 20
    ```
    
    **Returns a ChartConfig** ready for frontend rendering.
    """
    if not viz_module.database_visualization_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Visualization service not initialized"
        )
    
    result = viz_module.database_visualization_service.generate_custom_visualization(request)
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error or "Failed to generate custom visualization"
        )
    
    return result


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health check for visualization service"
)
async def visualization_health():
    """Check if visualization service is available"""
    return {
        "status": "healthy" if viz_module.database_visualization_service else "unavailable",
        "service": "database_visualization"
    }
