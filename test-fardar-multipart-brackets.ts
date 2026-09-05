import axios from 'axios';
import FormData from 'form-data';

async function run() {
  const apiUrl = "https://www.fdedomestic.com/api/parcel";
  const apiKey = "7ec55dd3b431498b3f1a";
  const clientId = "3880";

  const form = new FormData();
  form.append('client_id', clientId);
  form.append('api_key', apiKey);
  form.append('client_ref', `TEST4-${Date.now()}`);
  form.append('parcel_weight', '1.0');
  form.append('parcel_description', 'Clothing');
  form.append('recipient_name', 'Test User');
  form.append('recipient_phone', '0771234567');
  
  form.append('recipient_address[0]', '123 Main St');
  form.append('recipient_address[1]', 'Galle Road');
  form.append('recipient_address[2]', 'Colombo');
  
  form.append('recipient_district', 'Colombo');
  form.append('recipient_city', 'Colombo');
  form.append('amount', '1500');
  form.append('exchange', '0');

  try {
    const res = await axios.post(`${apiUrl}/new_api_v1.php`, form, {
      headers: form.getHeaders()
    });
    console.log("Response with multipart brackets:", res.data);
  } catch (err: any) {
    console.error("Multipart Brackets Error:", err.response?.data || err.message);
  }
}
run();
