import fs from 'fs';

async function verify() {
  const start = Date.now();
  try {
    console.log("Logging in...");
    // Assuming backend is at localhost:5000 based on standard setup.
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'test-agent'
      },
      body: JSON.stringify({
        email: 'superadmin@laural.com',
        password: 'Password123!'
      })
    });
    
    // Check cookies
    const cookies = loginRes.headers.getSetCookie();
    if (!cookies || cookies.length === 0) {
      console.log("No cookies received.");
      return;
    }
    
    const jwtCookieFull = cookies.find((c: string) => c.trim().startsWith('jwt='));
    const jwtCookie = jwtCookieFull ? jwtCookieFull.split(';')[0] : '';
    
    console.log("Fetching analytics overview...");
    const analyticsStart = Date.now();
    const res = await fetch('http://localhost:5000/api/v1/analytics/overview?period=Today&branch=All', {
      headers: {
        Cookie: jwtCookie || '',
        'User-Agent': 'test-agent'
      }
    });
    const data = await res.json();
    const duration = Date.now() - analyticsStart;
    
    console.log(`Analytics fetched successfully in ${duration}ms`);
    console.log(`Response:`, data);
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

verify();
