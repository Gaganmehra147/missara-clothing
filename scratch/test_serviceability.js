const axios = require('axios');
require('dotenv').config();

async function testServiceability() {
  try {
    console.log('Logging in with:', process.env.NIMBUSPOST_EMAIL);
    const loginRes = await axios.post('https://api.nimbuspost.com/v1/users/login', {
      email: process.env.NIMBUSPOST_EMAIL,
      password: process.env.NIMBUSPOST_PASSWORD
    });

    if (loginRes.data && loginRes.data.status) {
      const token = loginRes.data.data;
      console.log('Login Success. Testing Serviceability (482001 -> 487118)...');
      
      const res = await axios.post('https://api.nimbuspost.com/v1/courier/serviceability', {
        origin: "482001",
        destination: "487118",
        weight: 500,
        payment_type: "cod",
        order_amount: 366
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Serviceability Response:', JSON.stringify(res.data, null, 2));
    } else {
      console.log('Login failed:', loginRes.data);
    }
  } catch (error) {
    console.error("API Error Response:", error.response ? error.response.data : error.message);
  }
}

testServiceability();
