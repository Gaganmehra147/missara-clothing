const axios = require('axios');

async function run() {
  const email = `testuser_${Date.now()}@gmail.com`;
  console.log("Simulating registration for:", email);
  
  try {
    const regRes = await axios.post('http://localhost:3000/api/auth/register', {
      name: "Test User",
      email: email,
      password: "password123",
      phone: "9876543210"
    });
    console.log("Registration Response:", regRes.data);
    
    console.log("\nSimulating login...");
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: email,
      password: "password123"
    });
    console.log("Login Response:", loginRes.data);
    
  } catch (error) {
    if (error.response) {
      console.error("API Error:", error.response.status, error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

run();
