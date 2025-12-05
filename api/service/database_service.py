# services/database_service.py
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from typing import Dict, List, Optional
import json

class DatabaseService:
    """Service for managing database connections and schema extraction"""
    
    def __init__(self):
        self._connections: Dict[str, Engine] = {}
    
    def connect_database(self, connection_id: str, connection_string: str) -> bool:
        """
        Connect to a SQL database and store the connection
        
        Args:
            connection_id: Unique identifier for this connection
            connection_string: SQLAlchemy connection string
                Examples:
                - PostgreSQL: postgresql://user:pass@host:port/dbname
                - MySQL: mysql+pymysql://user:pass@host:port/dbname
                - SQLite: sqlite:///path/to/db.sqlite
        """
        try:
            engine = create_engine(connection_string, pool_pre_ping=True)
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            self._connections[connection_id] = engine
            return True
        except Exception as e:
            raise Exception(f"Failed to connect to database: {str(e)}")
    
    def disconnect_database(self, connection_id: str) -> bool:
        """Disconnect and remove a database connection"""
        if connection_id in self._connections:
            self._connections[connection_id].dispose()
            del self._connections[connection_id]
            return True
        return False
    
    def get_logical_schema(self, connection_id: str) -> Dict:
        """
        Extract the logical schema from the connected database
        Returns a structured representation of tables, columns, types, and relationships
        """
        if connection_id not in self._connections:
            raise Exception(f"No connection found with id: {connection_id}")
        
        engine = self._connections[connection_id]
        inspector = inspect(engine)
        
        schema = {
            "database_type": engine.dialect.name,
            "tables": []
        }
        
        # Get all table names
        table_names = inspector.get_table_names()
        
        for table_name in table_names:
            table_info = {
                "table_name": table_name,
                "columns": [],
                "primary_keys": [],
                "foreign_keys": []
            }
            
            # Get columns
            columns = inspector.get_columns(table_name)
            for col in columns:
                table_info["columns"].append({
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col["nullable"],
                    "default": str(col["default"]) if col.get("default") else None
                })
            
            # Get primary keys
            pk_constraint = inspector.get_pk_constraint(table_name)
            if pk_constraint:
                table_info["primary_keys"] = pk_constraint.get("constrained_columns", [])
            
            # Get foreign keys
            fks = inspector.get_foreign_keys(table_name)
            for fk in fks:
                table_info["foreign_keys"].append({
                    "constrained_columns": fk["constrained_columns"],
                    "referred_table": fk["referred_table"],
                    "referred_columns": fk["referred_columns"]
                })
            
            schema["tables"].append(table_info)
        
        return schema
    
    def execute_query(self, connection_id: str, sql_query: str) -> List[Dict]:
        """
        Execute a SELECT query and return results as list of dictionaries
        Only allows SELECT statements for safety
        """
        if connection_id not in self._connections:
            raise Exception(f"No connection found with id: {connection_id}")
        
        # Security check: only allow SELECT queries
        query_upper = sql_query.strip().upper()
        if not query_upper.startswith("SELECT"):
            raise Exception("Only SELECT queries are allowed")
        
        # Additional security: block certain keywords
        dangerous_keywords = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE", "TRUNCATE"]
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                raise Exception(f"Query contains forbidden keyword: {keyword}")
        
        engine = self._connections[connection_id]
        
        try:
            with engine.connect() as conn:
                result = conn.execute(text(sql_query))
                # Convert result to list of dictionaries
                columns = result.keys()
                rows = [dict(zip(columns, row)) for row in result.fetchall()]
                return rows
        except Exception as e:
            raise Exception(f"Query execution failed: {str(e)}")
    
    def format_schema_for_llm(self, schema: Dict) -> str:
        """
        Format the schema in a way that's optimal for LLM understanding
        Creates a clear, readable description of the database structure
        """
        formatted = f"Database Type: {schema['database_type']}\n\n"
        formatted += "Database Schema:\n\n"
        
        for table in schema["tables"]:
            formatted += f"Table: {table['table_name']}\n"
            formatted += "Columns:\n"
            
            for col in table["columns"]:
                nullable = "NULL" if col["nullable"] else "NOT NULL"
                pk_marker = " (PRIMARY KEY)" if col["name"] in table["primary_keys"] else ""
                formatted += f"  - {col['name']}: {col['type']} {nullable}{pk_marker}\n"
            
            if table["foreign_keys"]:
                formatted += "Foreign Keys:\n"
                for fk in table["foreign_keys"]:
                    formatted += f"  - {', '.join(fk['constrained_columns'])} -> {fk['referred_table']}({', '.join(fk['referred_columns'])})\n"
            
            formatted += "\n"
        
        return formatted