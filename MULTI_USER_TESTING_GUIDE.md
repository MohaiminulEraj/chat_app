# Multi-User WebSocket Chat Testing Guide

## Overview

This guide will help you test multi-user messaging between different users in separate browser tabs.

## Prerequisites

1. Make sure your NestJS server is running on `http://localhost:3001`
2. Have the `simple_socketio_client.html` file ready
3. Generated test tokens (run `node generate-multiple-tokens.js` if needed)

## Test Users Available

- **Alice**: `18a008b0-d339-4629-99d8-f565cd8cf3e2`
- **Bob**: `8bc2abbf-3dde-4b42-aed4-56479d510249`
- **Charlie**: `f47ac10b-58cc-4372-a567-0e02b2c3d479`
- **Diana**: `550e8400-e29b-41d4-a716-446655440000`

## Step-by-Step Testing

### Step 1: Get Fresh Tokens

```bash
node generate-multiple-tokens.js
```

Copy the tokens that are printed - you'll need them for each user.

### Step 2: Open Multiple Browser Tabs

1. Open `simple_socketio_client.html` in **4 different browser tabs**
2. Each tab will represent a different user

### Step 3: Setup Each User Tab

#### Tab 1 - Alice

1. Select namespace: `direct-chat`
2. Paste Alice's JWT token in the token field
3. Click **Connect**
4. Click **Authenticate**
5. You should see: "Authenticated as user 18a008b0-d339-4629-99d8-f565cd8cf3e2"

#### Tab 2 - Bob

1. Select namespace: `direct-chat`
2. Paste Bob's JWT token in the token field
3. Click **Connect**
4. Click **Authenticate**
5. You should see: "Authenticated as user 8bc2abbf-3dde-4b42-aed4-56479d510249"

#### Tab 3 - Charlie

1. Select namespace: `direct-chat`
2. Paste Charlie's JWT token in the token field
3. Click **Connect**
4. Click **Authenticate**
5. You should see: "Authenticated as user f47ac10b-58cc-4372-a567-0e02b2c3d479"

#### Tab 4 - Diana

1. Select namespace: `direct-chat`
2. Paste Diana's JWT token in the token field
3. Click **Connect**
4. Click **Authenticate**
5. You should see: "Authenticated as user 550e8400-e29b-41d4-a716-446655440000"

### Step 4: Test Message Sending

#### Test 1: Alice sends message to Bob

**In Alice's tab:**

1. Click **Send Text Message** button
2. When prompted for recipient ID, enter: `8bc2abbf-3dde-4b42-aed4-56479d510249` (Bob's UUID)
3. Enter a message like: "Hi Bob, this is Alice!"
4. Click OK

**Expected Results:**

- Alice's tab: Should show "Send message response" with success
- Bob's tab: Should show "📨 NEW MESSAGE: From: 18a008b0-d339-4629-99d8-f565cd8cf3e2, Content: "Hi Bob, this is Alice!""
- Charlie & Diana tabs: Should see "userStatusChanged" events but NOT the message

#### Test 2: Bob replies to Alice

**In Bob's tab:**

1. Click **Send Text Message** button
2. Since a conversation exists, it should ask "Use existing conversation?"
3. Click OK to use existing conversation
4. Enter message: "Hi Alice! I got your message."
5. Click OK

**Expected Results:**

- Bob's tab: Shows successful send
- Alice's tab: Shows "📨 NEW MESSAGE: From: 8bc2abbf-3dde-4b42-aed4-56479d510249, Content: "Hi Alice! I got your message.""
- Charlie & Diana: No message (they're not part of this conversation)

#### Test 3: Start a group conversation

**In Charlie's tab:**

1. Click **Send Text Message**
2. Enter Diana's UUID as recipient: `550e8400-e29b-41d4-a716-446655440000`
3. Enter message: "Hey Diana, want to chat?"

**Expected Results:**

- Charlie's tab: Shows successful send
- Diana's tab: Shows the new message from Charlie
- Alice & Bob: Don't see this message (different conversation)

## Troubleshooting

### If users don't see each other's messages:

1. **Check Authentication**: Each user must be authenticated (green "Connected (User: UUID)" status)
2. **Check Recipient ID**: Make sure you're using the correct UUID for the recipient
3. **Check Server Logs**: Look for any errors in the NestJS server console
4. **Check Browser Console**: Open DevTools (F12) and look for JavaScript errors

### If authentication fails:

1. **Check Token Expiry**: Tokens expire after 24 hours - generate new ones
2. **Check Server Secret**: Make sure the JWT secret matches between client and server
3. **Check Network**: Ensure the server is running on `http://localhost:3001`

### Common Error Messages:

- `"Either conversationId or recipientId is required"`: You need to specify who to send the message to
- `"Authentication failed"`: Your JWT token is invalid or expired
- `"Access denied to this conversation"`: You're trying to join a conversation you're not part of

## What You Should See

### Successful Multi-User Flow:

1. Each user connects and authenticates successfully
2. When User A sends to User B, only User B sees the message
3. When they reply, both users see the conversation flow
4. Other users (C & D) only see status changes, not private messages
5. Conversation IDs are automatically managed
6. Users are automatically joined to conversation rooms

### Normal Events You'll See:

- `userStatusChanged`: When users come online/offline (this is NORMAL)
- `newMessage`: When someone sends you a message
- `connected`: When you first connect to the server
- Various authentication and join events

Remember: **userStatusChanged events are expected behavior** - they indicate the real-time status system is working correctly!
