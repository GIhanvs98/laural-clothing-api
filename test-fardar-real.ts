import axios from 'axios';

async function run() {
  const apiUrl = "https://www.fdedomestic.com/api/parcel";
  const apiKey = "7ec55dd3b431498b3f1a";
  const clientId = "3880";

  // Try underscore syntax first
  const data2 = new URLSearchParams();
  data2.append('client_id', clientId);
  data2.append('api_key', apiKey);
  data2.append('client_ref', `TEST2-${Date.now()}`);
  data2.append('parcel_weight', '1.0');
  data2.append('parcel_description', 'Clothing');
  data2.append('recipient_name', 'Test User');
  data2.append('recipient_phone', '0771234567');
  
  data2.append('recipient_address_1', '123 Main St');
  data2.append('recipient_address_2', 'Galle Road');
  data2.append('recipient_address_3', 'Colombo');
  
  data2.append('recipient_district', 'Colombo');
  data2.append('recipient_city', 'Colombo');
  data2.append('amount', '1500');
  data2.append('exchange', '0');

  try {
    const res2 = await axios.post(`${apiUrl}/new_api_v1.php`, data2, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log("Response with underscore syntax:", res2.data);
  } catch (err: any) {
    console.error("Underscore Error:", err.response?.data || err.message);
  }

  // Now try array bracket syntax
  const data = new URLSearchParams();
  data.append('client_id', clientId);
  data.append('api_key', apiKey);
  data.append('client_ref', `TEST-${Date.now()}`);
  data.append('parcel_weight', '1.0');
  data.append('parcel_description', 'Clothing');
  data.append('recipient_name', 'Test User');
  data.append('recipient_phone', '0771234567');
  
  data.append('recipient_address[0]', '123 Main St');
  data.append('recipient_address[1]', 'Galle Road');
  data.append('recipient_address[2]', 'Colombo');
  
  data.append('recipient_district', 'Colombo');
  data.append('recipient_city', 'Colombo');
  data.append('amount', '1500');
  data.append('exchange', '0');

  try {
    const res = await axios.post(`${apiUrl}/new_api_v1.php`, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log("Response with bracket syntax:", res.data);
  } catch (err: any) {
    console.error("Bracket Error:", err.response?.data || err.message);
  }
}
run();
