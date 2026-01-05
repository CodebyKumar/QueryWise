from typing import Optional
import logging
import re
from service.rag.gemini_service import gemini_service

logger = logging.getLogger(__name__)


class SQLGenerationService:
    """Service for generating SQL queries from natural language using Gemini LLM"""
    
    def __init__(self):
        self.dangerous_keywords = [
            "DROP", "DELETE", "INSERT", "UPDATE", "ALTER", 
            "CREATE", "TRUNCATE", "GRANT", "REVOKE", "EXEC",
            "EXECUTE", "MERGE", "REPLACE"
        ]
    
    async def generate_sql(
        self, 
        natural_language_query: str, 
        formatted_schema: str,
        model: Optional[str] = None
    ) -> str:
        """
        Generate SQL query from natural language using Gemini LLM
        
        Args:
            natural_language_query: User's question in natural language
            formatted_schema: Database schema formatted for LLM understanding
            model: Optional model name to use
            
        Returns:
            Generated SQL query string
            
        Raises:
            Exception: If SQL generation fails or validation fails
        """
        try:
            # Create structured prompt for SQL generation
            prompt = self._create_sql_generation_prompt(
                natural_language_query, 
                formatted_schema
            )
            
            # Generate SQL using Gemini
            logger.info(f"Generating SQL for query: {natural_language_query} using model: {model}")
            response = await gemini_service.generate_answer(prompt, model=model)
            
            # Extract clean SQL from response
            sql_query = self._extract_sql_from_response(response)
            
            # Validate the generated SQL
            self._validate_sql(sql_query)
            
            logger.info(f"Generated SQL: {sql_query}")
            return sql_query
            
        except Exception as e:
            logger.error(f"SQL generation failed: {str(e)}")
            raise Exception(f"Failed to generate SQL: {str(e)}")
    
    def _create_sql_generation_prompt(
        self, 
        user_query: str, 
        schema: str
    ) -> str:
        """Create a structured prompt for SQL generation"""
        prompt = f"""You are an expert SQL query generator. Generate a COMPLETE, VALID, SYNTACTICALLY CORRECT SQL SELECT query.

DATABASE SCHEMA:
{schema}

USER QUESTION: {user_query}

CRITICAL REQUIREMENTS:
1. Generate ONLY a SELECT query (no INSERT, UPDATE, DELETE, DROP, etc.)
2. Use EXACT table and column names from the schema above
3. ALL string literals MUST be enclosed in MATCHING single quotes (e.g., 'value')
4. Ensure ALL quotes are properly closed - count your quotes!
5. The query MUST have a FROM clause - this is MANDATORY
6. Use proper SQL syntax - no syntax errors allowed
7. For questions about relationships between tables, use JOINs based on foreign keys
8. Use GROUP BY with aggregate functions (COUNT, SUM, AVG, MAX, MIN) when counting or aggregating
9. Add WHERE clauses for filtering when needed
10. Add ORDER BY clauses when sorting is implied
11. Use LIMIT when the question asks for "top N" or similar
12. Return ONLY the SQL query on a SINGLE LINE - no explanations, no markdown, no code blocks
13. Do not wrap the query in quotes or backticks

EXAMPLES OF CORRECT QUERIES:

Simple queries:
- SELECT * FROM customers WHERE city = 'New York'
- SELECT name, email FROM customers WHERE created_at > '2024-01-01'
- SELECT COUNT(*) FROM orders WHERE status = 'Delivered'

Queries with JOINs:
- SELECT customers.name, COUNT(orders.order_id) FROM customers JOIN orders ON customers.customer_id = orders.customer_id GROUP BY customers.customer_id, customers.name
- SELECT products.product_name, SUM(order_items.quantity) FROM products JOIN order_items ON products.product_id = order_items.product_id GROUP BY products.product_id, products.product_name
- SELECT customers.name, orders.order_date, orders.total_amount FROM customers JOIN orders ON customers.customer_id = orders.customer_id WHERE orders.status = 'Delivered'

Queries with aggregations:
- SELECT customer_id, COUNT(*) as order_count FROM orders GROUP BY customer_id ORDER BY order_count DESC
- SELECT category, AVG(price) as avg_price FROM products GROUP BY category
- SELECT status, COUNT(*) as count FROM orders GROUP BY status

Complex queries:
- SELECT c.name, COUNT(DISTINCT o.order_id) as total_orders, SUM(o.total_amount) as total_spent FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.name ORDER BY total_spent DESC LIMIT 10

IMPORTANT: Your response must be ONLY the SQL query, nothing else. Write it on a single line.

Generate the SQL query now:"""
        
        return prompt
    
    def _extract_sql_from_response(self, response: str) -> str:
        """
        Extract clean SQL query from LLM response
        Handles cases where LLM wraps SQL in markdown or adds explanations
        """
        logger.info(f"Raw LLM response: {response[:200]}...")  # Log first 200 chars
        
        # Remove markdown code blocks if present
        sql = response.strip()
        
        # Remove ```sql or ``` markers
        sql = re.sub(r'^```sql\s*', '', sql, flags=re.IGNORECASE)
        sql = re.sub(r'^```\s*', '', sql)
        sql = re.sub(r'\s*```$', '', sql)
        
        # Remove ONLY wrapping quotes/backticks (not quotes within the SQL)
        # Check if the entire string is wrapped in quotes
        if len(sql) >= 2:
            # Check for matching wrapping quotes
            if (sql[0] == '"' and sql[-1] == '"') or \
               (sql[0] == "'" and sql[-1] == "'") or \
               (sql[0] == '`' and sql[-1] == '`'):
                sql = sql[1:-1]
                logger.info("Removed wrapping quotes")
        
        # If there are multiple lines, try to find the SELECT statement
        lines = sql.split('\n')
        if len(lines) > 1:
            logger.info(f"Multi-line response, {len(lines)} lines found")
            for line in lines:
                line = line.strip()
                if line.upper().startswith('SELECT'):
                    # Take this line as the SQL
                    sql = line
                    logger.info(f"Extracted SELECT line: {sql[:100]}...")
                    break
        
        # Clean up excessive whitespace (but preserve single spaces)
        sql = ' '.join(sql.split())
        
        logger.info(f"Final extracted SQL: {sql}")
        return sql.strip()
    
    def _validate_sql(self, sql_query: str) -> None:
        """
        Validate SQL query for security and correctness
        
        Raises:
            Exception: If validation fails
        """
        if not sql_query:
            raise Exception("Generated SQL query is empty")
        
        # Convert to uppercase for checking
        sql_upper = sql_query.upper().strip()
        
        # Must start with SELECT
        if not sql_upper.startswith("SELECT"):
            raise Exception(
                "Only SELECT queries are allowed. "
                f"Query starts with: {sql_query[:20]}"
            )
        
        # Check for dangerous keywords
        for keyword in self.dangerous_keywords:
            # Use word boundaries to avoid false positives
            pattern = r'\b' + keyword + r'\b'
            if re.search(pattern, sql_upper):
                raise Exception(
                    f"Query contains forbidden keyword: {keyword}. "
                    "Only SELECT queries are allowed."
                )
        
        # Basic syntax check - ensure it has FROM clause
        if 'FROM' not in sql_upper:
            raise Exception(
                "Invalid SQL: Query must contain a FROM clause"
            )
        
        # Check for unmatched quotes
        single_quote_count = sql_query.count("'")
        if single_quote_count % 2 != 0:
            raise Exception(
                f"Invalid SQL: Unmatched single quotes detected. "
                f"Found {single_quote_count} single quotes (must be even). "
                f"Query: {sql_query}"
            )
        
        # Check for unmatched double quotes
        double_quote_count = sql_query.count('"')
        if double_quote_count % 2 != 0:
            raise Exception(
                f"Invalid SQL: Unmatched double quotes detected. "
                f"Found {double_quote_count} double quotes (must be even). "
                f"Query: {sql_query}"
            )
        
        logger.info("SQL validation passed")
    
    def validate_sql_syntax(self, sql_query: str) -> bool:
        """
        Additional syntax validation (can be extended)
        
        Returns:
            True if syntax appears valid
        """
        try:
            self._validate_sql(sql_query)
            return True
        except Exception:
            return False


# Singleton instance
sql_generation_service = SQLGenerationService()
