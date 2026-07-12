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
      
      // Test payload based on server.js
      const orderPayload = {
        order_number: 'MS-TEST-' + Date.now(),
        payment_type: "cod",
        order_amount: 366,
        package_weight: 500,
        package_length: 10,
        package_width: 10,
        package_height: 10,
        auto_ship: 0,
        auto_pickup: 0,
        consignee: {
          name: "Test User",
          phone: "9999999999",
          address: "Test Address",
          city: "Jabalpur",
          state: "Madhya Pradesh",
          pincode: "482001"
        },
        pickup: {
          warehouse_name: "Missara Warehouse",
          name: "Gagan Mehra",
          address: "village koosiwada tehsil gotegaon",
          city: "Narsinghpur",
          state: "Madhya Pradesh",
          pincode: "487118",
          phone: "7692931715"
        },
        order_items: [{
          name: "Kurti",
          qty: 1,
          price: 366,
          sku: "SKU-1"
        }]
      };

      try {
        console.log('Creating shipment with auto_ship=0...');
        const createRes = await axios.post('https://api.nimbuspost.com/v1/shipments', orderPayload, {
          headers: { 'Authorization': `Bearer ${res.data.data}` }
        });
        console.log('Order Success:', createRes.data);
      } catch (err) {
        console.error('Order API Error Response:', err.response ? err.response.data : err.message);
      }
      
    } else {
      console.log('Login failed:', res.data);
    }
  } catch (error) {
    console.error("Auth API Error Response:", error.response ? error.response.data : error.message);
  }
}

testNimbus();
