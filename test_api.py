#!/usr/bin/env python3
"""
Test script for Text-to-SQL API
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/query"

def test_health():
    """Test health check endpoint"""
    print("🔍 Testing health check...")
    response = requests.get(f"{BASE_URL}{API_PREFIX}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_connect():
    """Test database connection"""
    print("\n🔍 Testing database connection...")
    
    # Use the test database we created
    db_path = "/Users/kumarswamikallimath/Desktop/MINI/test_ecommerce.db"
    connection_string = f"sqlite:///{db_path}"
    
    payload = {
        "connection_string": connection_string
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/connect",
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        return response.json()["connection_id"]
    return None

def test_query(connection_id, query):
    """Test natural language query"""
    print(f"\n🔍 Testing query: '{query}'")
    
    payload = {
        "connection_id": connection_id,
        "natural_language_query": query
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/execute",
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    
    if result.get("success"):
        print(f"✅ Generated SQL: {result['generated_sql']}")
        print(f"✅ Rows returned: {result['row_count']}")
        if result['results']:
            print(f"✅ Sample result: {json.dumps(result['results'][0], indent=2)}")
    else:
        print(f"❌ Error: {result.get('error')}")
    
    return result

def test_schema(connection_id):
    """Test schema extraction"""
    print(f"\n🔍 Testing schema extraction...")
    
    response = requests.get(f"{BASE_URL}{API_PREFIX}/schema/{connection_id}")
    
    print(f"Status: {response.status_code}")
    result = response.json()
    
    if result.get("success"):
        print(f"✅ Database type: {result['database_type']}")
        print(f"✅ Tables found: {len(result['database_schema']['tables'])}")
        print("\n📋 Formatted Schema:")
        print(result['formatted_schema'][:500] + "...")
    
    return result

def test_disconnect(connection_id):
    """Test disconnection"""
    print(f"\n🔍 Testing disconnection...")
    
    response = requests.delete(f"{BASE_URL}{API_PREFIX}/disconnect/{connection_id}")
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.json()["success"]

def main():
    print("=" * 60)
    print("Text-to-SQL API Test Suite")
    print("=" * 60)
    
    # Wait for server to be ready
    print("\n⏳ Waiting for server to be ready...")
    for i in range(10):
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=1)
            if response.status_code == 200:
                print("✅ Server is ready!")
                break
        except requests.exceptions.RequestException:
            time.sleep(1)
    else:
        print("❌ Server is not responding. Please start the server first.")
        return
    
    # Run tests
    try:
        # Test 1: Health check
        if not test_health():
            print("❌ Health check failed")
            return
        
        # Test 2: Connect to database
        connection_id = test_connect()
        if not connection_id:
            print("❌ Database connection failed")
            return
        
        print(f"\n✅ Connected with ID: {connection_id}")
        
        # Test 3: Get schema
        test_schema(connection_id)
        
        # Test 4: Run queries
        queries = [
            "Show me all customers",
            "What are the top 5 products by price?",
            "Show me all orders with status 'Delivered'",
            "Which customer has placed the most orders?",
        ]
        
        for query in queries:
            test_query(connection_id, query)
            time.sleep(1)  # Rate limiting
        
        # Test 5: Security test (should fail)
        print("\n🔒 Testing security validation...")
        test_query(connection_id, "DELETE FROM customers")
        
        # Test 6: Disconnect
        test_disconnect(connection_id)
        
        print("\n" + "=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
