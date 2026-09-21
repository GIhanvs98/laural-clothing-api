const axios = require('axios');
(async () => {
  try {
    const res = await axios.post('http://127.0.0.1:5000/api/v1/products', {
      name: "Test Product",
      allowedPaymentMethods: [],
      variants: {
        create: [
          {
            price: 100,
            quantity: 0,
            inventoryItems: {
              create: [
                { branchId: "MAIN", quantity: 0 }
              ]
            }
          }
        ]
      }
    });
    console.log(res.data);
  } catch (err) {
    console.error("ERROR:", err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
})();
