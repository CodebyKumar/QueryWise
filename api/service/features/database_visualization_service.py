"""
Database Visualization Service

This service provides database-agnostic visualization metadata extraction.
It works with ANY SQL database supported by SQLAlchemy (PostgreSQL, MySQL, SQLite, etc.)

Design principles:
1. NO hardcoded table/column names
2. NO Supabase-specific logic
3. Safe, deterministic SQL only (no LLM-generated queries)
4. Rule-based chart generation (no guessing joins/relationships)

Performance optimizations:
- Uses ThreadPoolExecutor to process tables in parallel
- Batches all statistics queries per table into single SQL statement
- Moves blocking DB I/O off async event loop using run_in_executor
- Thread-safe session handling per worker thread
"""

from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine
from typing import List, Dict, Any, Optional, Tuple
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial

from schema.visualization_schema import (
    TableMetadata,
    ColumnMetadata,
    ColumnDataType,
    TableStatistics,
    NumericColumnStats,
    ChartConfig,
    DatabaseVisualizationResponse,
    CustomVisualizationRequest,
    CustomVisualizationResponse
)

logger = logging.getLogger(__name__)

# Thread pool for parallel table processing
# SQLAlchemy engines are thread-safe by default (connection pooling)
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="db_viz_worker")


class DatabaseVisualizationService:
    """
    Service for extracting visualization metadata from any SQL database.
    Uses SQLAlchemy's reflection capabilities for database-agnostic operations.
    """
    
    def __init__(self, sql_analysis_service):
        """
        Initialize with reference to SQL analysis service for connection management.
        
        Args:
            sql_analysis_service: Instance of SQLAnalysisService for DB connections
        """
        self.sql_analysis_service = sql_analysis_service
    
    def _categorize_column_type(self, sql_type: str) -> ColumnDataType:
        """
        Categorize SQL data type into visualization-friendly categories.
        Database-agnostic type mapping.
        
        Args:
            sql_type: SQL data type string (e.g., 'INTEGER', 'VARCHAR', 'TIMESTAMP')
            
        Returns:
            ColumnDataType enum value
        """
        sql_type_upper = sql_type.upper()
        
        # Numeric types
        if any(t in sql_type_upper for t in [
            'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT',
            'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL',
            'MONEY', 'NUMBER'
        ]):
            return ColumnDataType.NUMERIC
        
        # Timestamp/Date types
        if any(t in sql_type_upper for t in [
            'TIMESTAMP', 'DATETIME', 'DATE', 'TIME'
        ]):
            return ColumnDataType.TIMESTAMP
        
        # Boolean types
        if any(t in sql_type_upper for t in ['BOOL', 'BOOLEAN', 'BIT']):
            return ColumnDataType.BOOLEAN
        
        # Text types (default for VARCHAR, TEXT, CHAR, etc.)
        if any(t in sql_type_upper for t in [
            'CHAR', 'VARCHAR', 'TEXT', 'STRING', 'CLOB'
        ]):
            return ColumnDataType.TEXT
        
        return ColumnDataType.OTHER
    
    def _is_id_column(self, column_name: str) -> bool:
        """
        Heuristic to identify ID columns that shouldn't be visualized.
        
        Args:
            column_name: Name of the column
            
        Returns:
            True if column appears to be an ID column
        """
        name_lower = column_name.lower()
        return (
            name_lower.endswith('_id') or 
            name_lower.endswith('id') or
            name_lower == 'id' or
            name_lower.startswith('fk_') or
            name_lower.endswith('_key')
        )
    
    def _get_row_count(self, engine: Engine, table_name: str) -> int:
        """
        Safely get row count for a table using parameterized query.
        
        Args:
            engine: SQLAlchemy engine
            table_name: Name of the table
            
        Returns:
            Number of rows in the table
        """
        try:
            # Use COUNT(*) which is safe and deterministic
            # Note: We cannot parameterize table names in standard SQL,
            # but we validate table name exists via SQLAlchemy inspector
            with engine.connect() as conn:
                result = conn.execute(
                    text(f'SELECT COUNT(*) as count FROM "{table_name}"')
                )
                return result.fetchone()[0]
        except Exception as e:
            logger.warning(f"Failed to get row count for {table_name}: {str(e)}")
            return 0
    
    def _process_single_table(
        self,
        engine: Engine,
        table_name: str,
        inspector,
        include_statistics: bool
    ) -> Tuple[Optional[TableMetadata], Optional[TableStatistics], int]:
        """
        Process a single table to extract metadata and statistics.
        
        This function runs in a worker thread for parallel processing.
        Each thread gets its own DB connection from the engine's connection pool.
        
        Args:
            engine: SQLAlchemy engine (thread-safe)
            table_name: Name of the table to process
            inspector: SQLAlchemy inspector (cached, thread-safe for reads)
            include_statistics: Whether to compute numeric statistics
            
        Returns:
            Tuple of (TableMetadata, TableStatistics or None, row_count)
        """
        try:
            logger.info(f"[Worker Thread] Processing table: {table_name}")
            
            # Get row count
            row_count = self._get_row_count(engine, table_name)
            
            # Get columns metadata
            columns_info = inspector.get_columns(table_name)
            pk_constraint = inspector.get_pk_constraint(table_name)
            fks = inspector.get_foreign_keys(table_name)
            
            primary_keys = pk_constraint.get('constrained_columns', []) if pk_constraint else []
            foreign_key_columns = set()
            for fk in fks:
                foreign_key_columns.update(fk.get('constrained_columns', []))
            
            # Build column metadata
            columns: List[ColumnMetadata] = []
            numeric_columns = []
            timestamp_columns = []
            text_columns = []
            
            for col in columns_info:
                col_name = col['name']
                sql_type = str(col['type'])
                category = self._categorize_column_type(sql_type)
                
                column_meta = ColumnMetadata(
                    name=col_name,
                    data_type=sql_type,
                    category=category,
                    nullable=col.get('nullable', True),
                    is_primary_key=col_name in primary_keys,
                    is_foreign_key=col_name in foreign_key_columns
                )
                columns.append(column_meta)
                
                # Categorize for easy access (skip ID columns for visualization)
                if not self._is_id_column(col_name):
                    if category == ColumnDataType.NUMERIC:
                        numeric_columns.append(col_name)
                    elif category == ColumnDataType.TIMESTAMP:
                        timestamp_columns.append(col_name)
                    elif category == ColumnDataType.TEXT:
                        text_columns.append(col_name)
            
            # Create table metadata
            table_meta = TableMetadata(
                table_name=table_name,
                row_count=row_count,
                columns=columns,
                numeric_columns=numeric_columns,
                timestamp_columns=timestamp_columns,
                text_columns=text_columns,
                primary_keys=primary_keys
            )
            
            # Get statistics if requested (using batched query)
            table_stats = None
            if include_statistics and numeric_columns:
                numeric_stats = self._get_table_statistics(engine, table_name, numeric_columns)
                if numeric_stats:
                    table_stats = TableStatistics(
                        table_name=table_name,
                        row_count=row_count,
                        numeric_stats=numeric_stats
                    )
            
            return table_meta, table_stats, row_count
            
        except Exception as e:
            logger.error(f"[Worker Thread] Failed to process table {table_name}: {str(e)}")
            return None, None, 0
    
    def _get_table_statistics(
        self, 
        engine: Engine, 
        table_name: str, 
        numeric_columns: List[str]
    ) -> List[NumericColumnStats]:
        """
        Get statistics for ALL numeric columns in a single batched query.
        
        Performance improvement: Instead of N separate queries (one per column),
        we execute a single query with all aggregations. This dramatically reduces
        the N+1 query problem.
        
        Args:
            engine: SQLAlchemy engine
            table_name: Name of the table
            numeric_columns: List of numeric column names (limited to first 5 for performance)
            
        Returns:
            List of NumericColumnStats
        """
        if not numeric_columns:
            return []
        
        try:
            # Limit to first 5 numeric columns to avoid excessively long queries
            columns_to_process = numeric_columns[:5]
            
            # Build a single SELECT with all aggregate functions for all columns
            # This executes in one DB round-trip instead of N trips
            select_parts = []
            for col_name in columns_to_process:
                # Each column gets: COUNT, MIN, MAX, AVG, SUM
                select_parts.append(f'''
                    COUNT("{col_name}") as "{col_name}_count",
                    MIN("{col_name}") as "{col_name}_min",
                    MAX("{col_name}") as "{col_name}_max",
                    AVG("{col_name}") as "{col_name}_avg",
                    SUM("{col_name}") as "{col_name}_sum"
                '''.strip())
            
            query = text(f'''
                SELECT {", ".join(select_parts)}
                FROM "{table_name}"
            ''')
            
            # Execute single batched query
            with engine.connect() as conn:
                result = conn.execute(query)
                row = result.fetchone()
                
                if not row:
                    return []
                
                # Parse results into NumericColumnStats objects
                stats_list = []
                for idx, col_name in enumerate(columns_to_process):
                    # Results are in groups of 5: count, min, max, avg, sum
                    base_idx = idx * 5
                    stats_list.append(NumericColumnStats(
                        column_name=col_name,
                        count=row[base_idx] or 0,
                        min_value=float(row[base_idx + 1]) if row[base_idx + 1] is not None else None,
                        max_value=float(row[base_idx + 2]) if row[base_idx + 2] is not None else None,
                        avg_value=float(row[base_idx + 3]) if row[base_idx + 3] is not None else None,
                        sum_value=float(row[base_idx + 4]) if row[base_idx + 4] is not None else None
                    ))
                
                return stats_list
                
        except Exception as e:
            logger.warning(f"Failed to get batched stats for {table_name}: {str(e)}")
            return []
    
    async def get_database_visualization_metadata(
        self,
        connection_id: str,
        include_statistics: bool = True,
        max_tables: Optional[int] = None
    ) -> DatabaseVisualizationResponse:
        """
        Extract comprehensive visualization metadata from connected database.
        
        PERFORMANCE OPTIMIZATIONS:
        1. Async/await: Moves blocking DB I/O off the event loop
        2. Parallel processing: Uses ThreadPoolExecutor to process multiple tables concurrently
        3. Batched queries: Single query per table for all numeric statistics (eliminates N+1)
        4. Thread-safe: SQLAlchemy engine pool handles concurrent connections safely
        
        This is the main entry point for database visualization.
        Works with any SQL database connection.
        
        Args:
            connection_id: Active database connection ID
            include_statistics: Whether to compute statistics (may be slow for large DBs)
            max_tables: Limit number of tables to analyze (for performance)
            
        Returns:
            DatabaseVisualizationResponse with all metadata and suggested charts
        """
        try:
            # Get engine from connection manager
            engine = self.sql_analysis_service._connections.get(connection_id)
            if not engine:
                return DatabaseVisualizationResponse(
                    success=False,
                    connection_id=connection_id,
                    database_type="unknown",
                    tables=[],
                    total_tables=0,
                    total_rows=0,
                    error="Connection not found"
                )
            
            # Get inspector (cached, thread-safe for reads)
            inspector = inspect(engine)
            database_type = engine.dialect.name
            
            # Get all table names
            table_names = inspector.get_table_names()
            
            # Apply limit if specified
            if max_tables:
                table_names = table_names[:max_tables]
            
            logger.info(f"Processing {len(table_names)} tables in parallel...")
            
            # Process tables in parallel using ThreadPoolExecutor
            # This moves blocking DB I/O off the async event loop
            loop = asyncio.get_event_loop()
            
            # Submit all table processing tasks to thread pool
            futures = []
            for table_name in table_names:
                # Use partial to create callable with all arguments bound
                task = partial(
                    self._process_single_table,
                    engine,
                    table_name,
                    inspector,
                    include_statistics
                )
                # run_in_executor moves blocking work to thread pool
                future = loop.run_in_executor(_executor, task)
                futures.append(future)
            
            # Wait for all futures to complete
            # This allows tables to be processed concurrently
            results = await asyncio.gather(*futures, return_exceptions=True)
            
            # Collect results
            tables_metadata: List[TableMetadata] = []
            statistics: List[TableStatistics] = []
            total_rows = 0
            
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Table processing failed: {str(result)}")
                    continue
                
                table_meta, table_stats, row_count = result
                
                if table_meta:
                    tables_metadata.append(table_meta)
                    total_rows += row_count
                
                if table_stats:
                    statistics.append(table_stats)
            
            logger.info(f"Parallel processing complete: {len(tables_metadata)} tables processed")
            
            # Generate suggested charts using rule-based logic
            suggested_charts = self._generate_suggested_charts(
                tables_metadata, 
                statistics,
                database_type
            )
            
            return DatabaseVisualizationResponse(
                success=True,
                connection_id=connection_id,
                database_type=database_type,
                tables=tables_metadata,
                statistics=statistics,
                suggested_charts=suggested_charts,
                total_tables=len(tables_metadata),
                total_rows=total_rows
            )
            
        except Exception as e:
            logger.error(f"Failed to get visualization metadata: {str(e)}")
            return DatabaseVisualizationResponse(
                success=False,
                connection_id=connection_id,
                database_type="unknown",
                tables=[],
                total_tables=0,
                total_rows=0,
                error=str(e)
            )
    
    def _generate_suggested_charts(
        self,
        tables: List[TableMetadata],
        statistics: List[TableStatistics],
        database_type: str
    ) -> List[ChartConfig]:
        """
        Generate suggested chart configurations using rule-based logic.
        NO guessing of joins or relationships - only safe, deterministic charts.
        
        Enhanced naming: Uses human-readable titles derived from table/column names
        and aggregation logic.
        
        Args:
            tables: List of table metadata
            statistics: List of table statistics
            database_type: Type of database
            
        Returns:
            List of ChartConfig objects with enhanced titles and descriptions
        """
        charts: List[ChartConfig] = []
        
        # Chart 1: Database Overview - Table Row Counts (Bar Chart)
        # Enhanced: Use database type in title, format description with total stats
        if tables:
            total_rows = sum(t.row_count for t in tables)
            data = [
                {"table": t.table_name, "rows": t.row_count}
                for t in sorted(tables, key=lambda x: x.row_count, reverse=True)
            ]
            
            charts.append(ChartConfig(
                chart_id="overview_row_counts",
                chart_type="bar",
                title=f"{database_type.upper()} Database: Records per Table",
                description=f"Overview of {len(tables)} tables containing {total_rows:,} total records. Shows data distribution across your database schema.",
                data=data,
                x_axis="table",
                y_axis="rows",
                x_label="Table Name",
                y_label="Number of Records"
            ))
        
        # Chart 2: Table-specific numeric summaries
        # Enhanced: Use descriptive titles with column and table names
        for stat in statistics[:3]:  # Limit to first 3 tables
            if stat.numeric_stats:
                # Pick the first numeric column for demonstration
                col_stat = stat.numeric_stats[0]
                
                if col_stat.count > 0:
                    data = []
                    
                    # Format values for better readability
                    if col_stat.min_value is not None:
                        data.append({"metric": "Minimum", "value": col_stat.min_value})
                    if col_stat.max_value is not None:
                        data.append({"metric": "Maximum", "value": col_stat.max_value})
                    if col_stat.avg_value is not None:
                        data.append({"metric": "Average", "value": round(col_stat.avg_value, 2)})
                    
                    if data:
                        # Create human-readable column name (convert snake_case to Title Case)
                        readable_column = col_stat.column_name.replace('_', ' ').title()
                        readable_table = stat.table_name.replace('_', ' ').title()
                        
                        charts.append(ChartConfig(
                            chart_id=f"stats_{stat.table_name}_{col_stat.column_name}",
                            chart_type="bar",
                            title=f"{readable_table}: {readable_column} Analysis",
                            description=f"Statistical summary of {readable_column.lower()} across {col_stat.count:,} records in the {stat.table_name} table.",
                            data=data,
                            x_axis="metric",
                            y_axis="value",
                            x_label="Statistical Metric",
                            y_label=readable_column
                        ))
        
        # Chart 3: Table Distribution (Pie Chart)
        # Enhanced: Only show if there's meaningful distribution, add percentage context
        if len(tables) > 1:
            total_rows = sum(t.row_count for t in tables)
            # Only create pie chart if there's meaningful distribution (not all zeros)
            data = [
                {"table": t.table_name, "rows": t.row_count}
                for t in tables if t.row_count > 0
            ]
            
            if data and len(data) > 1:
                charts.append(ChartConfig(
                    chart_id="table_distribution",
                    chart_type="pie",
                    title="Data Distribution Across Tables",
                    description=f"Proportional view of {total_rows:,} total records distributed across {len(data)} tables. Larger slices indicate tables with more data.",
                    data=data,
                    x_axis="table",
                    y_axis="rows",
                    x_label="Table Name",
                    y_label="Records"
                ))
        
        return charts
    
    def generate_custom_visualization(
        self,
        request: CustomVisualizationRequest
    ) -> CustomVisualizationResponse:
        """
        Generate a custom visualization based on user-specified parameters.
        Uses safe, deterministic SQL with proper validation.
        
        Args:
            request: CustomVisualizationRequest with table, columns, and chart params
            
        Returns:
            CustomVisualizationResponse with chart config or error
        """
        try:
            # Get engine
            engine = self.sql_analysis_service._connections.get(request.connection_id)
            if not engine:
                return CustomVisualizationResponse(
                    success=False,
                    error="Connection not found"
                )
            
            inspector = inspect(engine)
            
            # Validate table exists
            table_names = inspector.get_table_names()
            if request.table_name not in table_names:
                return CustomVisualizationResponse(
                    success=False,
                    error=f"Table '{request.table_name}' not found"
                )
            
            # Validate columns exist
            columns_info = inspector.get_columns(request.table_name)
            column_names = [col['name'] for col in columns_info]
            
            if request.dimension_column and request.dimension_column not in column_names:
                return CustomVisualizationResponse(
                    success=False,
                    error=f"Column '{request.dimension_column}' not found"
                )
            
            if request.metric_column not in column_names:
                return CustomVisualizationResponse(
                    success=False,
                    error=f"Column '{request.metric_column}' not found"
                )
            
            # Validate aggregation function
            valid_aggs = ['count', 'sum', 'avg', 'min', 'max']
            if request.aggregation.lower() not in valid_aggs:
                return CustomVisualizationResponse(
                    success=False,
                    error=f"Invalid aggregation: {request.aggregation}"
                )
            
            # Build safe SQL query
            agg_func = request.aggregation.upper()
            
            if request.dimension_column:
                # Grouped query
                query = text(f'''
                    SELECT 
                        "{request.dimension_column}" as dimension,
                        {agg_func}("{request.metric_column}") as value
                    FROM "{request.table_name}"
                    WHERE "{request.dimension_column}" IS NOT NULL
                    GROUP BY "{request.dimension_column}"
                    ORDER BY value {request.order_by.upper()}
                    LIMIT :limit
                ''')
            else:
                # Single aggregate value
                query = text(f'''
                    SELECT 
                        '{request.aggregation}' as dimension,
                        {agg_func}("{request.metric_column}") as value
                    FROM "{request.table_name}"
                ''')
            
            # Execute query
            with engine.connect() as conn:
                result = conn.execute(query, {"limit": request.limit} if request.dimension_column else {})
                rows = result.fetchall()
            
            # Convert to chart data
            data = [
                {
                    request.dimension_column or "metric": str(row[0]),
                    request.metric_column: float(row[1]) if row[1] is not None else 0
                }
                for row in rows
            ]
            
            # Create chart config
            chart_config = ChartConfig(
                chart_id=f"custom_{request.table_name}_{request.metric_column}",
                chart_type=request.chart_type,
                title=f"{request.table_name}: {request.aggregation.upper()}({request.metric_column})",
                description=f"Custom visualization: {request.aggregation} of {request.metric_column}" + 
                           (f" by {request.dimension_column}" if request.dimension_column else ""),
                data=data,
                x_axis=request.dimension_column or "metric",
                y_axis=request.metric_column,
                x_label=request.dimension_column or "Metric",
                y_label=f"{request.aggregation.title()}({request.metric_column})"
            )
            
            return CustomVisualizationResponse(
                success=True,
                chart_config=chart_config
            )
            
        except Exception as e:
            logger.error(f"Failed to generate custom visualization: {str(e)}")
            return CustomVisualizationResponse(
                success=False,
                error=str(e)
            )


# Singleton instance - will be initialized in main.py with sql_analysis_service
database_visualization_service = None
