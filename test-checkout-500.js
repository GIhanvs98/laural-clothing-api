const axios = require('axios');

async function test() {
  try {
    // 1. Get a cart id first (or just mock it)
    const cartRes = await axios.get('http://localhost:3000/api/v1/cart');
    const cartId = cartRes.data.id;

    // We need to add an item to the cart first, otherwise "Cart is empty" error
    // Let's assume there is an active cart in the system, but since we don't have a cookie, we can't easily reproduce.
  } catch (e) {
    console.error(e);
  }
}
test();
