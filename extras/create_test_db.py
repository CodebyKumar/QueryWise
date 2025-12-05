import sqlite3
import os
from datetime import datetime, timedelta
import random

# Create test database
db_path = "/Users/kumarswamikallimath/Desktop/MINI/test_ecommerce.db"

# Remove existing database if it exists
if os.path.exists(db_path):
    os.remove(db_path)

# Create connection
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create tables
cursor.execute("""
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    city TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

cursor.execute("""
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(10, 2),
    stock_quantity INTEGER
)
""")

cursor.execute("""
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2),
    status TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
)
""")

cursor.execute("""
CREATE TABLE order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price DECIMAL(10, 2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
)
""")

# Insert sample customers
customers = [
    ("John Doe", "john.doe@email.com", "New York"),
    ("Jane Smith", "jane.smith@email.com", "Los Angeles"),
    ("Bob Johnson", "bob.j@email.com", "Chicago"),
    ("Alice Williams", "alice.w@email.com", "Houston"),
    ("Charlie Brown", "charlie.b@email.com", "Phoenix"),
    ("Diana Prince", "diana.p@email.com", "Philadelphia"),
    ("Eve Davis", "eve.d@email.com", "San Antonio"),
    ("Frank Miller", "frank.m@email.com", "San Diego"),
]

for name, email, city in customers:
    cursor.execute(
        "INSERT INTO customers (name, email, city) VALUES (?, ?, ?)",
        (name, email, city)
    )

# Insert sample products
products = [
    ("Laptop", "Electronics", 999.99, 50),
    ("Smartphone", "Electronics", 699.99, 100),
    ("Headphones", "Electronics", 149.99, 200),
    ("Desk Chair", "Furniture", 299.99, 30),
    ("Standing Desk", "Furniture", 599.99, 20),
    ("Coffee Maker", "Appliances", 79.99, 75),
    ("Blender", "Appliances", 49.99, 60),
    ("Running Shoes", "Sports", 129.99, 150),
    ("Yoga Mat", "Sports", 29.99, 100),
    ("Water Bottle", "Sports", 19.99, 200),
]

for product_name, category, price, stock in products:
    cursor.execute(
        "INSERT INTO products (product_name, category, price, stock_quantity) VALUES (?, ?, ?, ?)",
        (product_name, category, price, stock)
    )

# Insert sample orders
statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]
base_date = datetime.now() - timedelta(days=90)

for i in range(20):
    customer_id = random.randint(1, 8)
    order_date = base_date + timedelta(days=random.randint(0, 90))
    total_amount = round(random.uniform(50, 2000), 2)
    status = random.choice(statuses)
    
    cursor.execute(
        "INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES (?, ?, ?, ?)",
        (customer_id, order_date, total_amount, status)
    )
    
    order_id = cursor.lastrowid
    
    # Add 1-4 items per order
    num_items = random.randint(1, 4)
    for _ in range(num_items):
        product_id = random.randint(1, 10)
        quantity = random.randint(1, 3)
        
        # Get product price
        cursor.execute("SELECT price FROM products WHERE product_id = ?", (product_id,))
        price = cursor.fetchone()[0]
        
        cursor.execute(
            "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
            (order_id, product_id, quantity, price)
        )

conn.commit()
conn.close()

print(f"✅ Test database created successfully at: {db_path}")
print("\nDatabase contains:")
print("- 8 customers")
print("- 10 products")
print("- 20 orders")
print("- Multiple order items")
print("\nYou can now test queries like:")
print("- 'Show me all customers'")
print("- 'What are the top 5 products by price?'")
print("- 'Show me all orders from the last 30 days'")
print("- 'Which customers have spent the most money?'")
