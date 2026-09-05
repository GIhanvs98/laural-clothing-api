import axios from 'axios';
import FormData from 'form-data';

async function testEndpoints() {
  const baseUrls = [
    'https://www.fdedomestic.com/api/parcel',
    'https://www.fdedomestic.com/api',
    'https://www.fdedomestic.com'
  ];
  
  const endpoints = [
    'cities.php',
    'get_cities.php',
    'city_list.php',
    'get_districts.php',
    'districts.php',
    'fardar_cities.php',
    'branches.php'
  ];

  for (const base of baseUrls) {
    for (const ep of endpoints) {
      try {
        const url = `${base}/${ep}`;
        const res = await axios.get(url, { timeout: 3000 });
        if (res.status === 200 && (typeof res.data === 'object' || res.data.length > 0)) {
            console.log(`Endpoint ${url} returned 200:`, typeof res.data === 'string' ? res.data.substring(0, 50) : Object.keys(res.data));
        }
      } catch (e: any) {
        // Ignore 404s to keep output clean
      }
    }
  }
}

testEndpoints();
