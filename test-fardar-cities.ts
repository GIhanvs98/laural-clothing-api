import axios from 'axios';
import FormData from 'form-data';

async function testEndpoints() {
  const apiUrl = 'https://www.fdedomestic.com/api/parcel';
  const apiKey = '7ec55dd3b431498b3f1a';
  const clientId = '3880';
  
  const endpoints = [
    'cities.php',
    'districts.php',
    'locations.php',
    'get_cities.php',
    'city_list.php',
    'get_districts.php',
    'get_locations.php',
    'city_api_v1.php',
    'district_api_v1.php'
  ];

  for (const ep of endpoints) {
    try {
      const form = new FormData();
      form.append('client_id', clientId);
      form.append('api_key', apiKey);
      
      const res = await axios.post(`${apiUrl}/${ep}`, form, {
        headers: form.getHeaders(),
        timeout: 5000
      });
      console.log(`Endpoint ${ep} returned status ${res.status}:`, res.data);
    } catch (e: any) {
      if (e.response) {
        console.log(`Endpoint ${ep} returned ${e.response.status}`);
      } else {
        console.log(`Endpoint ${ep} failed: ${e.message}`);
      }
    }
  }
}

testEndpoints();
