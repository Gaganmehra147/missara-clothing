const axios = require('axios');
require('dotenv').config();

async function testNimbus() {
  try {
    console.log('Logging in with:', process.env.NIMBUSPOST_EMAIL);
    const res = await axios.post('https://api.nimbuspost.com/v1/users/login', {
      email: process.env.NIMBUSPOST_EMAIL,
      password: process.env.NIMBUSPOST_PASSWORD
    });
    
    if (res.data && res.data.status) {
      console.log('Login Success! Token:', res.data.data.substring(0, 10) + '...');
      
      // Test payloads
      const payloads = [
        {
          name: "Test Delhivery Air with Primary Warehouse (482001)",
          payload: {
            order_number: 'MS-TEST-DEL-PRI-' + Date.now(),
            payment_type: "cod",
            order_amount: 366,
            package_weight: 500,
            package_length: 10,
            package_width: 10,
            package_height: 10,
            auto_ship: 0,
            auto_pickup: 0,
            courier_id: 1,
            consignee: {
              name: "Test User",
              phone: "7692931715",
              address: "Test Address",
              city: "Jabalpur",
              state: "Madhya Pradesh",
              pincode: "482001"
            },
            pickup: {
              warehouse_name: "Primary",
              name: "Missara Admin",
              address: "Missara Store",
              city: "Jabalpur",
              state: "Madhya Pradesh",
              pincode: "482001",
              phone: "7692931715"
            },
            order_items: [{
              name: "Kurti",
              qty: 1,
              price: 366,
              sku: "SKU-1"
            }]
          }
        }
      ];

      for (const t of payloads) {
        try {
          console.log(`\n--- Running: ${t.name} ---`);
          const createRes = await axios.post('https://api.nimbuspost.com/v1/shipments', t.payload, {
            headers: { 'Authorization': `Bearer ${res.data.data}` }
          });
          console.log('Result:', createRes.data);
        } catch (err) {
          console.error('API Error Response:', err.response ? err.response.data : err.message);
        }
      }
      
    } else {
      console.log('Login failed:', res.data);
    }
  } catch (error) {
    console.error("Auth API Error Response:", error.response ? error.response.data : error.message);
  }
}

testNimbus();
