# Socket.IO One-to-One Chat Test Client

This directory contains comprehensive testing tools for the Socket.IO one-to-one chat functionality in the unified Socket.IO system.

## 📁 Files Overview

- **`socketio-one-to-one-test.js`** - Complete Node.js test client with 9 comprehensive tests
- **`test-socketio.sh`** - Bash script for easy test execution and setup
- **`package.json`** - Node.js dependencies for the test client
- **`.env.tokens`** - Auto-generated JWT tokens (created after first run)

## 🚀 Quick Start

### Option 1: Using the Bash Script (Recommended)

```bash
# Navigate to test-client directory
cd test-client

# Run all tests (setup + get tokens + run tests)
./test-socketio.sh

# Or run individual steps
./test-socketio.sh --setup    # Install dependencies
./test-socketio.sh --tokens   # Get JWT tokens
./test-socketio.sh --run      # Run tests only
```

### Option 2: Manual Setup

```bash
# Navigate to test-client directory
cd test-client

# Install dependencies
npm install

# Set environment variables with your JWT tokens
export USER1_JWT_TOKEN="your-jwt-token-for-user-1"
export USER2_JWT_TOKEN="your-jwt-token-for-user-2"

# Run tests
node socketio-one-to-one-test.js
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_URL` | Socket.IO server URL | `http://localhost:3000` |
| `USER1_JWT_TOKEN` | JWT token for test user 1 | Required |
| `USER2_JWT_TOKEN` | JWT token for test user 2 | Required |
| `TEST_EMAIL_1` | Email for auto-login user 1 | `test1@example.com` |
| `TEST_PASSWORD_1` | Password for auto-login user 1 | `password123` |
| `TEST_EMAIL_2` | Email for auto-login user 2 | `test2@example.com` |
| `TEST_PASSWORD_2` | Password for auto-login user 2 | `password123` |

### Getting JWT Tokens

#### Option 1: Automatic (using test script)
The bash script will automatically attempt to get tokens using the test credentials.

#### Option 2: Manual via cURL
```bash
# Get token for user 1
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@example.com","password":"password123"}'

# Get token for user 2
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"password123"}'
```

#### Option 3: From Postman Collection
Use the provided Postman collection to login and copy the tokens from the response.

## 🧪 Test Coverage

The test suite covers all major Socket.IO one-to-one chat features:

### ✅ Test Cases

1. **Connection & Authentication**
   - WebSocket connection establishment
   - JWT token authentication
   - User ID extraction

2. **Direct Messaging**
   - Sending text messages
   - Message delivery confirmation
   - Real-time message reception

3. **Bidirectional Communication**
   - Two-way message exchange
   - Response handling
   - Conversation flow

4. **Typing Indicators**
   - Typing start/stop events
   - Real-time typing notifications
   - Conversation context

5. **Voice Calls**
   - Call initiation
   - Call acceptance/rejection
   - Call state management

6. **Call Management**
   - Call termination
   - Participant management
   - Event propagation

7. **Status Updates**
   - User status changes
   - Status broadcasting
   - Real-time status sync

8. **Read Receipts**
   - Message read marking
   - Read receipt delivery
   - Conversation state tracking

9. **Error Handling**
   - Invalid operation handling
   - Error response validation
   - Graceful failure management

## 📊 Test Output Example

```
🚀 Starting Socket.IO One-to-One Chat Tests
============================================================
[2024-01-15T15:30:01.123Z] ℹ️  User 1 connected to server
[2024-01-15T15:30:01.234Z] ℹ️  User 1 authenticated as user-uuid-1
[2024-01-15T15:30:01.345Z] ℹ️  User 2 connected to server
[2024-01-15T15:30:01.456Z] ℹ️  User 2 authenticated as user-uuid-2
[2024-01-15T15:30:02.567Z] ✅ Test passed: User Connection and Authentication
[2024-01-15T15:30:03.678Z] ℹ️  User 2 received message: "Hello from User 1!" from User One
[2024-01-15T15:30:03.789Z] ✅ Test passed: Direct Message Sending
...

📊 Test Results Summary
============================================================
Total Tests: 9
✅ Passed: 9
❌ Failed: 0
Success Rate: 100.0%

✅ Passed Tests:
  • User Connection and Authentication
  • Direct Message Sending
  • Bidirectional Messaging
  • Typing Indicators
  • Voice Call Initiation and Response
  • Call Termination
  • User Status Updates
  • Message Read Receipts
  • Error Handling for Invalid Operations

🏁 All tests completed!
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Connection Failed
```
❌ Connection timeout
```
**Solution:** Ensure your server is running on the correct port:
```bash
# Check if server is running
curl http://localhost:3000/health

# Start your server
npm run start:dev
```

#### 2. Authentication Failed
```
❌ Authentication failed: Invalid token
```
**Solution:** Get fresh JWT tokens:
```bash
./test-socketio.sh --tokens
```

#### 3. Message Not Received
```
❌ Message not received
```
**Possible causes:**
- Users are not friends (check friendship relationship)
- WebSocket connection dropped
- Server-side message routing issues

#### 4. Call Failed
```
❌ Call initiation failed
```
**Solution:** Ensure both users are online and have valid friendship.

### Debug Mode

For detailed debugging, modify the test script:

```javascript
// In socketio-one-to-one-test.js, set debug mode
const socket = io(this.serverUrl, {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  debug: true  // Add this line
});
```

## 🔗 Related Documentation

- **`SOCKETIO_ONE_TO_ONE_ENDPOINTS.md`** - Complete API reference
- **`SOCKETIO_QUICK_REFERENCE.md`** - Quick endpoint reference
- **`postman/`** - Postman collection for HTTP endpoints

## 📝 Usage Examples

### Running Specific Test Categories

```bash
# Test only messaging
node -e "
const tester = require('./socketio-one-to-one-test.js');
const config = { /* your config */ };
const t = new tester(config);
// Run only specific tests
"

# Custom server URL
SERVER_URL=http://192.168.1.100:3000 ./test-socketio.sh

# Custom test credentials
TEST_EMAIL_1=user1@test.com TEST_PASSWORD_1=pass123 ./test-socketio.sh --tokens
```

### Integration with CI/CD

```yaml
# GitHub Actions example
- name: Test Socket.IO Chat
  run: |
    cd test-client
    npm install
    export USER1_JWT_TOKEN="${{ secrets.TEST_USER1_TOKEN }}"
    export USER2_JWT_TOKEN="${{ secrets.TEST_USER2_TOKEN }}"
    node socketio-one-to-one-test.js
```

## 📄 License

This test client is part of the Socket.IO unified chat system project.
