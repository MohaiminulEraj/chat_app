// Simple command-line Socket.io client for testing WebSockets
const { io } = require('socket.io-client');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Configuration
const config = {
    server: 'http://localhost:3001',
    namespace: '/direct-chat',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXVpZCI6IjdmNjAwNzZhLTYzODQtNDIwZi05YWRjLWM1ZmUzM2RiZWNjYSIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc1Mjg1OTY3NywiZXhwIjoxNzUyODYzMjc3fQ.FzWsMlWomiiBlEf3PY_lhpwCdWOsGgcTivVxuJaF3t0',
    authenticated: false,
    userId: null,
    conversationId: null
};

console.log('Kitty Chat WebSocket Client');
console.log('==========================');
console.log(`Connecting to: ${config.server}${config.namespace}`);

// Create socket instance
const socket = io(`${config.server}${config.namespace}`, {
    transports: ['websocket', 'polling']
});

// Connection events
socket.on('connect', () => {
    console.log('Connected to server!');
    console.log('Socket ID:', socket.id);
    console.log('\nType "help" for available commands');
    promptUser();
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    config.authenticated = false;
});

socket.on('connected', (data) => {
    console.log('\nServer welcome message:', data);
});

// Event listeners for various events
socket.on('newMessage', (data) => {
    console.log('\nNew message received:', JSON.stringify(data, null, 2));
    promptUser();
});

socket.on('messagesRead', (data) => {
    console.log('\nMessages read:', JSON.stringify(data, null, 2));
    promptUser();
});

socket.on('userTyping', (data) => {
    console.log('\nUser typing:', JSON.stringify(data, null, 2));
    promptUser();
});

socket.on('messageDeleted', (data) => {
    console.log('\nMessage deleted:', JSON.stringify(data, null, 2));
    promptUser();
});

socket.on('messageEdited', (data) => {
    console.log('\nMessage edited:', JSON.stringify(data, null, 2));
    promptUser();
});

socket.on('userStatusChanged', (data) => {
    console.log('\nUser status changed:', JSON.stringify(data, null, 2));
    promptUser();
});

// Function to authenticate
function authenticate() {
    console.log('Authenticating...');
    socket.emit('authenticate', { token: config.token }, (response) => {
        console.log('Authentication response:', response);
        if (response && response.success) {
            config.authenticated = true;
            config.userId = response.userId;
            console.log('Successfully authenticated! User ID:', config.userId);
        } else {
            console.log('Authentication failed.');
        }
        promptUser();
    });
}

// Function to send a message
function sendMessage() {
    if (!config.authenticated) {
        console.log('You must authenticate first');
        return promptUser();
    }

    rl.question('Enter recipient ID (or press Enter to use conversation ID): ', (recipientId) => {
        if (!recipientId && !config.conversationId) {
            console.log('You need either a recipient ID or conversation ID');
            return promptUser();
        }

        const messageData = recipientId 
            ? { recipientId, type: 'text' } 
            : { conversationId: config.conversationId, type: 'text' };

        rl.question('Enter message content: ', (content) => {
            messageData.content = content;

            console.log('Sending message:', messageData);
            socket.emit('sendMessage', messageData, (response) => {
                console.log('Send message response:', response);
                
                if (response && response.success && response.message && response.message.conversationId) {
                    config.conversationId = response.message.conversationId;
                    console.log('Conversation ID set to:', config.conversationId);
                }
                
                promptUser();
            });
        });
    });
}

// Function to set typing status
function setTypingStatus() {
    if (!config.authenticated) {
        console.log('You must authenticate first');
        return promptUser();
    }

    if (!config.conversationId) {
        console.log('No conversation ID set. Please send a message first or set conversation ID manually.');
        return promptUser();
    }

    rl.question('Typing status (true/false): ', (status) => {
        const isTyping = status.toLowerCase() === 'true';
        
        socket.emit('typing', {
            conversationId: config.conversationId,
            isTyping
        }, (response) => {
            console.log('Typing status response:', response);
            promptUser();
        });
    });
}

// Function to mark messages as read
function markAsRead() {
    if (!config.authenticated) {
        console.log('You must authenticate first');
        return promptUser();
    }

    if (!config.conversationId) {
        console.log('No conversation ID set. Please send a message first or set conversation ID manually.');
        return promptUser();
    }

    rl.question('Enter message IDs (comma separated): ', (messageIds) => {
        const messageIdArray = messageIds.split(',').map(id => id.trim());
        
        socket.emit('markAsRead', {
            conversationId: config.conversationId,
            messageIds: messageIdArray
        }, (response) => {
            console.log('Mark as read response:', response);
            promptUser();
        });
    });
}

// Function to set conversation ID manually
function setConversationId() {
    rl.question('Enter conversation ID: ', (id) => {
        config.conversationId = id;
        console.log('Conversation ID set to:', config.conversationId);
        promptUser();
    });
}

// Function to set token manually
function setToken() {
    rl.question('Enter JWT token: ', (token) => {
        config.token = token;
        console.log('Token set');
        promptUser();
    });
}

// Process user commands
function processCommand(cmd) {
    switch (cmd.toLowerCase()) {
        case 'auth':
        case 'authenticate':
            authenticate();
            break;
            
        case 'send':
        case 'message':
            sendMessage();
            break;
            
        case 'typing':
            setTypingStatus();
            break;
            
        case 'read':
            markAsRead();
            break;
            
        case 'conv':
        case 'conversation':
            setConversationId();
            break;
            
        case 'token':
            setToken();
            break;
            
        case 'status':
            console.log('\nCurrent Status:');
            console.log('- Connected:', socket.connected);
            console.log('- Authenticated:', config.authenticated);
            console.log('- User ID:', config.userId);
            console.log('- Conversation ID:', config.conversationId);
            promptUser();
            break;
            
        case 'quit':
        case 'exit':
            console.log('Disconnecting...');
            socket.disconnect();
            rl.close();
            process.exit(0);
            break;
            
        case 'help':
            console.log('\nAvailable commands:');
            console.log('- auth, authenticate: Authenticate with server');
            console.log('- send, message: Send a new message');
            console.log('- typing: Set typing status');
            console.log('- read: Mark messages as read');
            console.log('- conv, conversation: Set conversation ID manually');
            console.log('- token: Set JWT token manually');
            console.log('- status: Show current connection status');
            console.log('- quit, exit: Disconnect and exit');
            console.log('- help: Show this help message');
            promptUser();
            break;
            
        default:
            console.log('Unknown command. Type "help" for available commands.');
            promptUser();
    }
}

// Prompt for user input
function promptUser() {
    rl.question('\n> ', (input) => {
        processCommand(input);
    });
}

// Handle errors
socket.on('error', (error) => {
    console.error('Socket error:', error);
    promptUser();
});

process.on('SIGINT', () => {
    console.log('\nDisconnecting...');
    socket.disconnect();
    rl.close();
    process.exit(0);
});
