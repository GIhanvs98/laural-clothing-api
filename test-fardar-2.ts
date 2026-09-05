import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiUrl = process.env.FARDAR_API_URL;
  const apiKey = process.env.FARDAR_API_KEY;
  const clientId = process.env.FARDAR_CLIENT_ID;

  try {
    const payload = {
      reference: "LC-12345",
      recipient_name: "John Doe",
      recipient_phone: "+94771234567",
      recipient_address: "123 Main St",
      recipient_city: "Colombo",
      weight: 1,
      cod_amount: 0,
    };

    const response = await axios.post(
      `${apiUrl}/shipments`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Client-ID': clientId || '',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Success:', response.data);
  } catch (error: any) {
    console.error('Fardar API Error Response:', error.response?.data || error.message);
  }
}

run();
