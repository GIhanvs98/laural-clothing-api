import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env") });

import { generateAccessToken, generateFingerprint } from "../src/utils/jwt";

const BASE_URL = "http://localhost:5000/api/v1";

const token = generateAccessToken({
  userId: "admin-id-123",
  email: "admin@laural.com",
  roles: ["SUPER_ADMIN"],
  permissions: [],
  fingerprint: generateFingerprint("::1", "latency-tester") // Using basic IPv6 loopback and user agent
});

const endpoints = [
  "/products",
  "/orders",
  "/inventory",
  "/analytics/dashboard", // Assuming this exists based on standard analytics
  "/pos/cart", // pos cart
];

async function measure(endpoint: string, iterations: number = 15) {
  const times: number[] = [];
  const url = `${BASE_URL}${endpoint}`;
  
  console.log(`Warming up ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "latency-tester",
        "X-Forwarded-For": "::1"
      }
    });
    
    if (!res.ok) {
        console.log(`Warning: Endpoint ${url} returned ${res.status}`);
    }
  } catch (e) {
    console.error(`Error connecting to ${url}`, e);
    return;
  }

  console.log(`Measuring ${url} (${iterations} iterations)...`);
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "latency-tester",
        "X-Forwarded-For": "::1"
      }
    });
    
    // consume body to ensure full transfer
    await res.text();
    
    const end = performance.now();
    times.push(end - start);
  }

  times.sort((a, b) => a - b);
  
  const p95Index = Math.floor(times.length * 0.95);
  const p95 = times.length > 0 ? (times[p95Index] || 0) : 0;
  const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  
  console.log(`[${endpoint}] - p95: ${p95.toFixed(2)}ms | avg: ${avg.toFixed(2)}ms`);
  
  return { endpoint, p95, avg };
}

async function run() {
  console.log("Starting latency tests...\n");
  const results = [];
  
  for (const endpoint of endpoints) {
    const res = await measure(endpoint);
    if (res) results.push(res);
  }
  
  console.log("\n--- Latency Report ---");
  results.forEach(r => {
    console.log(`${r.endpoint}: p95 = ${(r.p95 || 0).toFixed(2)}ms`);
  });
}

run();
