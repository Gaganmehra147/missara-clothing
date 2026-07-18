const axios = require('axios');
require('dotenv').config();

async function cancelShipments() {
  try {
    console.log('Logging in to NimbusPost...');
    const loginRes = await axios.post('https://api.nimbuspost.com/v1/users/login', {
      email: process.env.NIMBUSPOST_EMAIL,
      password: process.env.NIMBUSPOST_PASSWORD
    });

    if (!loginRes.data || !loginRes.data.status) {
      console.log('Login failed:', loginRes.data);
      return;
    }

    const token = loginRes.data.data;
    console.log('Login Success. Token retrieved.');

    const awbs = ['4152921970394', '23645497158035'];
    
    // We will try different endpoints to see which one works
    const endpoints = [
      { url: 'https://api.nimbuspost.com/v1/shipments/cancel', getPayload: (awb) => ({ awb }) },
      { url: 'https://api.nimbuspost.com/v1/shipments/cancel', getPayload: (awb) => ({ awb_number: awb }) },
      { url: 'https://api.nimbuspost.com/v1/shipments/cancel', getPayload: (awb) => ({ shipment_id: awb }) }
    ];

    for (const awb of awbs) {
      console.log(`\nAttempting to cancel AWB: ${awb}`);
      let cancelled = false;

      for (const endpoint of endpoints) {
        if (cancelled) break;
        try {
          const payload = endpoint.getPayload(awb);
          console.log(`Trying ${endpoint.url} with payload:`, JSON.stringify(payload));
          
          const res = await axios.post(endpoint.url, payload, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          console.log('Response:', JSON.stringify(res.data));
          if (res.data && res.data.status) {
            console.log(`AWB ${awb} cancelled successfully using this endpoint!`);
            cancelled = true;
          }
        } catch (err) {
          console.error(`Error with endpoint:`, err.response ? err.response.data : err.message);
        }
      }
    }

  } catch (error) {
    console.error("General Error:", error.message);
  }
}

cancelShipments();
