// Simple script to generate a test JWT token for WebSocket authentication
const jwt = require('jsonwebtoken');

// This should match the secret used in your server's conversation gateway
const JWT_SECRET = '3QANyH2zMoHrfxqfRWTLbPM';

// Sample user payload (adjust as needed based on your user structure)
const userPayload = {
    id: 1,
    uuid: '7f60076a-6384-420f-9adc-c5fe33dbecca', // Sample user UUID
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000), // Issued at
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // Expires in 1 hour
};

const token = jwt.sign(userPayload, JWT_SECRET);

console.log('Generated JWT Token:');
console.log(token);
console.log('\nToken payload:');
console.log(JSON.stringify(userPayload, null, 2));
console.log('\nCopy the token above and paste it into the test client.');
