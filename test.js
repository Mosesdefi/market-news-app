const https = require('https');

https.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd', (r) => {
  let d = '';
  r.on('data', (c) => d += c);
  r.on('end', () => console.log(d));
}).on('error', (e) => console.error('Error:', e.message));