// Simple test script to verify backend connection
// Run with: node test-connection.js

const API_URL = 'http://127.0.0.1:8000';

async function testConnection() {
  console.log('🔍 Testing backend connection...\n');

  try {
    // Test 1: Main endpoint
    console.log('1️⃣ Testing main endpoint...');
    const mainResponse = await fetch(`${API_URL}/`);
    const mainData = await mainResponse.json();
    console.log('✅ Main endpoint:', mainData.message);

    // Test 2: Health check
    console.log('\n2️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.message);

    // Test 3: RAG health
    console.log('\n3️⃣ Testing RAG health endpoint...');
    const ragHealthResponse = await fetch(`${API_URL}/rag/health`);
    const ragHealthData = await ragHealthResponse.json();
    console.log('✅ RAG health:', ragHealthData.message);

    console.log('\n🎉 All tests passed! Backend is ready.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start frontend: cd frontend && bun dev');
    console.log('   2. Open http://localhost:5173');
    console.log('   3. Create an account and start using the app!');

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running: cd api && python main.py');
    console.log('   2. Check if port 8000 is available');
    console.log('   3. Verify backend URL is http://127.0.0.1:8000');
  }
}

testConnection();
