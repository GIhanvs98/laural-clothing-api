import axios from 'axios';
import * as dotenv from 'dotenv';
import FormData from 'form-data';
dotenv.config();

async function run() {
  const apiUrl = process.env.FARDAR_API_URL;
  const apiKey = process.env.FARDAR_API_KEY;
  const clientId = process.env.FARDAR_CLIENT_ID;

  const base = {
    client_id: clientId || '',
    api_key: apiKey || '',
    client_ref: `LC-${Date.now()}`,
    parcel_weight: '1.50',
    parcel_description: 'T-Shirt',
    recipient_name: 'John Doe',
    recipient_district: 'Colombo',
    recipient_city: 'Colombo 03',
    recipient_phone: '0771234567',
    amount: '1500.00',
    exchange: '0'
  };

  // Test 1: Multipart Form Data with standard keys
  try {
    const form = new FormData();
    for (const [k, v] of Object.entries(base)) form.append(k, v);
    form.append('recipient_address_1', 'No 123, Main Street');
    form.append('recipient_address_2', 'Colombo 03');
    form.append('recipient_address_3', 'Colombo');

    const response = await axios.post(`${apiUrl}/new_api_v1.php`, form, {
      headers: form.getHeaders()
    });
    console.log(`Multipart test: ${response.data.status}`);
  } catch (err: any) {
    console.log(`Multipart test Error`);
  }

  // Test 2: URLSearchParams with array brackets
  try {
    const data = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) data.append(k, v);
    data.append('recipient_address[0]', 'No 123 Main Street');
    data.append('recipient_address[1]', 'Colombo 03');
    data.append('recipient_address[2]', 'Colombo');

    const response = await axios.post(`${apiUrl}/new_api_v1.php`, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log(`Array keys test: ${response.data.status}`);
  } catch (err: any) {
    console.log(`Array keys test Error`);
  }
}

run();
