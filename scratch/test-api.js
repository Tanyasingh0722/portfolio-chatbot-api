import handler from '../api/chat.js';

// Setup Mock Response Class
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = null;
  }

  setHeader(name, value) {
    this.headers[name] = value;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(data) {
    this.body = data;
    return this;
  }

  end() {
    return this;
  }
}

async function runTests() {
  console.log("🚀 Starting local API simulation...\n");

  // Test Case 1: OPTIONS Preflight Handshake
  console.log("Test Case 1: OPTIONS request (should return 200 with CORS headers)");
  const req1 = { method: 'OPTIONS' };
  const res1 = new MockResponse();

  await handler(req1, res1);
  console.log("✓ Status Code:", res1.statusCode);
  console.log("✓ Access-Control-Allow-Origin:", res1.headers['Access-Control-Allow-Origin']);
  console.log("✓ Access-Control-Allow-Methods:", res1.headers['Access-Control-Allow-Methods']);
  console.log("");

  // Test Case 2: POST request missing API Key (Expected Error)
  console.log("Test Case 2: POST request without GROQ_API_KEY")
  const req2 = {
    method: 'POST',
    body: { message: "Tell me about Tanya." }
  };
  const res2 = new MockResponse();

  // Explicitly ensure the key is undefined for this test
  delete process.env.GROQ_API_KEY;

  await handler(req2, res2);
  console.log("✓ Status Code:", res2.statusCode);
  console.log("✓ Response JSON:", JSON.stringify(res2.body));
  console.log("");

  // Test Case 3: GET request (should return 405 Method Not Allowed)
  console.log("Test Case 3: GET request (should return 405 error)");
  const req3 = { method: 'GET' };
  const res3 = new MockResponse();

  await handler(req3, res3);
  console.log("✓ Status Code:", res3.statusCode);
  console.log("✓ Response JSON:", JSON.stringify(res3.body));
  console.log("\n🎉 Test suite execution completed.");
}

runTests().catch(err => {
  console.error("Test runner crashed:", err);
});
