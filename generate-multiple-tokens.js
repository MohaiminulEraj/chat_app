// Script to generate multiple test JWT tokens for different users
const jwt = require('jsonwebtoken');

// This should match the secret used in your server
const JWT_SECRET = '3QANyH2zMoHrfxqfRWTLbPM';

// Create multiple test users
const testUsers = [
    {
        id: 1,
        uuid: '18a008b0-d339-4629-99d8-f565cd8cf3e2',
        email: 'alice@example.com',
        name: 'Alice'
    },
    {
        id: 2,
        uuid: '8bc2abbf-3dde-4b42-aed4-56479d510249',
        email: 'bob@example.com',
        name: 'Bob'
    },
    {
        id: 3,
        uuid: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        email: 'charlie@example.com',
        name: 'Charlie'
    },
    {
        id: 4,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        email: 'diana@example.com',
        name: 'Diana'
    }
];

console.log('Generated JWT Tokens for Multiple Test Users:');
console.log('='.repeat(60));

testUsers.forEach((user, index) => {
    const userPayload = {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // Expires in 24 hours
    };

    const token = jwt.sign(userPayload, JWT_SECRET);

    console.log(`\n${index + 1}. ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.uuid}`);
    console.log(`   Token: ${token}`);
});

console.log('\n' + '='.repeat(60));
console.log('Usage Instructions:');
console.log('1. Open multiple browser tabs with simple_socketio_client.html');
console.log('2. Use a different token in each tab');
console.log('3. Connect and authenticate in each tab');
console.log('4. Watch the userStatusChanged events flow between tabs');
console.log('5. Send messages between the different users');
console.log('\nNote: You can use any user UUID as recipientId when sending messages');
