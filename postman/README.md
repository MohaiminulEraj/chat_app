# 📮 Postman Collection for Unified Socket.IO System

This folder contains Postman collection and environment files for testing the unified Socket.IO real-time communication system.

## 📁 Files

- **`Unified_SocketIO_System.postman_collection.json`** - Main collection with all test endpoints
- **`Unified_SocketIO_System.postman_environment.json`** - Environment variables for testing

## 🚀 Quick Start

### 1. Import into Postman

1. Open Postman
2. Click **Import** button
3. Select both JSON files from this folder
4. The collection and environment will be imported

### 2. Set Up Environment

1. Select the "Socket.IO Unified System Environment" from the environment dropdown
2. The environment variables will be automatically populated during testing

### 3. Run the Tests

#### Option A: Full Workflow (Recommended)

1. Go to **🔐 Authentication & Setup** folder
2. Run requests in order:
    - Register Test User 1 & 2 (if needed)
    - Login User 1 & 2
    - Get My Profile
3. Go to **👥 Friendship Management**
    - Send Friend Request
    - Accept Friend Request
    - Get Friends List
4. Go to **👥 Group Management**
    - Create Test Group
    - Add Member to Group

#### Option B: Individual Testing

- Use any endpoint individually after setting up authentication

## 🔌 Socket.IO Testing

The collection includes comprehensive guides for Socket.IO WebSocket testing in the **🔌 Socket.IO WebSocket Testing** folder:

1. **Connection Guide** - How to connect to Socket.IO server
2. **Direct Messaging Events** - Real-time messaging between users
3. **Group Messaging Events** - Group chat functionality
4. **Voice/Video Call Events** - Call initiation and management
5. **Typing Indicators & Status** - Real-time status updates
6. **Error Handling & Events** - Error management and debugging

## 🧪 Live Testing

For actual real-time testing, use the HTML test client:

```bash
# Start test client server
cd test-client
python3 -m http.server 8080

# Open in browser
http://localhost:8080/unified-socketio-test.html
```

## 🎯 Test Scenarios

The collection includes a **🧪 Quick Test Scenarios** folder with:

- Complete step-by-step testing workflow
- Verification checkpoints
- Common issues and solutions
- Environment setup checks

## 📋 Collection Structure

```
🚀 Unified Socket.IO Real-Time System/
├── 🔐 Authentication & Setup/
│   ├── Login User 1
│   ├── Login User 2
│   ├── Register Test User 1
│   ├── Register Test User 2
│   └── Get My Profile
├── 👥 Friendship Management/
│   ├── Send Friend Request
│   ├── Accept Friend Request
│   ├── Get Friends List
│   └── Get Pending Requests
├── 👥 Group Management/
│   ├── Create Test Group
│   ├── Add Member to Group
│   ├── Get My Groups
│   └── Get Group Details
├── 💬 Conversation Management/
│   ├── Get My Conversations
│   └── Get Conversation Messages
├── 🔌 Socket.IO WebSocket Testing/
│   ├── 📋 Socket.IO Connection Guide
│   ├── 📨 Direct Messaging Events
│   ├── 👥 Group Messaging Events
│   ├── 📞 Voice/Video Call Events
│   ├── ⌨️ Typing Indicators & Status
│   └── 🔧 Error Handling & Events
└── 🧪 Quick Test Scenarios/
    └── 🎯 Complete Test Workflow
```

## 🔧 Environment Variables

The following variables are automatically set during testing:

### Server Configuration

- `base_url` - Server base URL (http://localhost:3000)
- `socketio_url` - Socket.IO server URL
- `test_client_url` - HTML test client URL

### Authentication

- `jwt_token` - JWT token for User 1 (auto-populated)
- `jwt_token_user2` - JWT token for User 2 (auto-populated)

### User Data

- `user_id` - Current user UUID
- `friend_id` - Friend user UUID
- `group_id` - Test group UUID
- `conversation_id` - Conversation UUID

### Test Data

- `test_user1_email` / `test_user1_password` - Test user 1 credentials
- `test_user2_email` / `test_user2_password` - Test user 2 credentials
- `group_name` / `group_description` / `group_country` - Test group data

## 🎓 Usage Tips

### For HTTP API Testing

1. Use the structured folders to test API endpoints
2. Variables are automatically populated from responses
3. Check the **Tests** tab in requests to see auto-population scripts

### For Socket.IO Testing

1. Use HTTP endpoints to set up data (users, groups, friendships)
2. Copy JWT tokens from Postman variables to Socket.IO clients
3. Use the HTML test client for real-time interaction testing
4. Refer to the WebSocket Testing folder for event examples

### For Debugging

1. Check Console tab in Postman for debug output
2. Variables are logged when auto-populated
3. Use the Error Handling guide for troubleshooting Socket.IO issues

## 🚨 Prerequisites

Before using this collection:

1. **Server Running**: Ensure your NestJS server is running on port 3000

    ```bash
    npm run start:dev
    ```

2. **Database Ready**: Ensure PostgreSQL and MongoDB are running and configured

3. **Test Client**: For Socket.IO testing, start the test client server:
    ```bash
    cd test-client
    python3 -m http.server 8080
    ```

## 🔍 Verification

To verify everything is working:

1. Run `GET {{base_url}}/health` - Should return 200 OK
2. Run `GET {{base_url}}/socket.io/` - Should return Socket.IO client script
3. Open `{{test_client_url}}/unified-socketio-test.html` - Should load test client

## 📞 Support

If you encounter issues:

1. Check the **🔧 Error Handling & Events** section in the collection
2. Verify environment variables are set correctly
3. Ensure server is running and accessible
4. Check browser console for client-side errors
5. Review server logs for backend errors

---

Happy testing! 🎉
