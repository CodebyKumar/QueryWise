# Database Chat - Quick Connection Guide

## ✅ Correct Connection Strings

### For Test Database (Recommended)

The test database is located at: `/Users/kumarswamikallimath/Desktop/MINI/test_ecommerce.db`

Since the API runs from `/Users/kumarswamikallimath/Desktop/MINI/api`, use:

**Option 1: Relative Path (Recommended)**
```
sqlite:///../test_ecommerce.db
```

**Option 2: Absolute Path**
```
sqlite:////Users/kumarswamikallimath/Desktop/MINI/test_ecommerce.db
```

### SQLite Path Formats

SQLite connection strings use this format:
```
sqlite:///[path]
```

- **Relative to API directory**: `sqlite:///../database.db` (go up one level)
- **Current directory**: `sqlite:///./database.db`
- **Absolute path**: `sqlite:////absolute/path/to/database.db` (4 slashes total)

### Other Databases

**PostgreSQL:**
```
postgresql://username:password@localhost:5432/database_name
```

**MySQL:**
```
mysql+pymysql://username:password@localhost:3306/database_name
```

---

## 🔧 Troubleshooting

### Error: "no such table: customers"

**Problem:** Wrong database path - the database file doesn't exist at the specified location.

**Solution:** 
1. Verify database exists: `ls -la /Users/kumarswamikallimath/Desktop/MINI/test_ecommerce.db`
2. Use correct connection string: `sqlite:///../test_ecommerce.db`

### Error: "unable to open database file"

**Problem:** File path is incorrect or file doesn't exist.

**Solution:**
1. Check if database file exists
2. Use absolute path if relative path doesn't work
3. Ensure API has read permissions

---

## 📝 Quick Start

1. **In the Database Chat UI:**
   - Click "▶ Quick Templates"
   - Select "SQLite (Test Database)"
   - Click "Connect"

2. **Try a query:**
   - "Show me all customers"
   - "What are the top 5 products by price?"

3. **View schema:**
   - Click "Schema" button on the connection card
   - Explore tables, columns, and relationships

---

## 🎯 Example Queries for Test Database

The test database has these tables:
- `customers` (8 rows)
- `products` (10 rows)
- `orders` (20 rows)
- `order_items` (multiple rows)

**Try these queries:**

```
Show me all customers
What are the top 5 products by price?
Show me all orders from the last 30 days
Which customer has the highest total spending?
How many orders are in 'Delivered' status?
Show me all products in the Electronics category
List all customers from New York
What is the average order value?
Show me the most popular products by order count
Which products are low in stock?
```

---

## 📊 Database Schema

```
customers
├── customer_id (INTEGER, PRIMARY KEY)
├── name (TEXT)
├── email (TEXT, UNIQUE)
├── city (TEXT)
└── created_at (TIMESTAMP)

products
├── product_id (INTEGER, PRIMARY KEY)
├── product_name (TEXT)
├── category (TEXT)
├── price (DECIMAL)
└── stock_quantity (INTEGER)

orders
├── order_id (INTEGER, PRIMARY KEY)
├── customer_id (INTEGER, FOREIGN KEY → customers)
├── order_date (TIMESTAMP)
├── total_amount (DECIMAL)
└── status (TEXT)

order_items
├── order_item_id (INTEGER, PRIMARY KEY)
├── order_id (INTEGER, FOREIGN KEY → orders)
├── product_id (INTEGER, FOREIGN KEY → products)
├── quantity (INTEGER)
└── price (DECIMAL)
```

---

## 🔗 Connection String Reference

| Database | Format | Example |
|----------|--------|---------|
| SQLite (Relative) | `sqlite:///../path/to/db.db` | `sqlite:///../test_ecommerce.db` |
| SQLite (Absolute) | `sqlite:////absolute/path` | `sqlite:////Users/user/db.db` |
| PostgreSQL | `postgresql://user:pass@host:port/db` | `postgresql://admin:secret@localhost:5432/mydb` |
| MySQL | `mysql+pymysql://user:pass@host:port/db` | `mysql+pymysql://root:pass@localhost:3306/mydb` |

---

## ✨ Tips

1. **Use Templates**: Click "Quick Templates" for pre-filled connection strings
2. **Test Connection**: The UI will show a green dot when connected
3. **View Schema**: Always check the schema to understand table structure
4. **Export Results**: Use CSV or JSON export for large result sets
5. **Multiple Connections**: You can connect to multiple databases simultaneously
