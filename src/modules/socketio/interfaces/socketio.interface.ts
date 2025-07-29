export interface SocketIOEvents {
    // Connection events
    connect: () => void
    disconnect: (reason: string) => void

    // Authentication
    authenticate: (data: { token: string }) => {
        success: boolean
        userId?: string
        error?: string
    }

    // Direct messaging
    sendDirectMessage: (data: {
        recipientId: string
        type: 'text' | 'image' | 'file' | 'voice'
        content?: string
        fileUrl?: string
        metadata?: any
    }) => {
        success: boolean
        message?: any
        conversationId?: string
        error?: string
    }

    joinDirectConversation: (data: { conversationId: string }) => {
        success: boolean
        error?: string
    }
    leaveDirectConversation: (data: { conversationId: string }) => {
        success: boolean
    }

    // Group messaging
    sendGroupMessage: (data: {
        groupId: string
        type: 'text' | 'image' | 'file' | 'voice'
        content?: string
        fileUrl?: string
        metadata?: any
        replyToMessageId?: string
    }) => { success: boolean; message?: any; groupId?: string; error?: string }

    joinGroup: (data: { groupId: string }) => {
        success: boolean
        groupId?: string
        error?: string
    }
    leaveGroup: (data: { groupId: string }) => {
        success: boolean
        groupId?: string
    }

    // Communication features
    typing: (data: {
        conversationId?: string
        groupId?: string
        isTyping: boolean
    }) => { success: boolean }

    markAsRead: (data: {
        conversationId?: string
        groupId?: string
        messageIds: string[]
    }) => { success: boolean; error?: string }

    // User status
    updateStatus: (data: {
        status: 'online' | 'away' | 'busy' | 'offline'
    }) => { success: boolean; status?: string; error?: string }

    // Voice/Video calls
    initiateCall: (data: {
        recipientId?: string
        groupId?: string
        callType: 'voice' | 'video'
        callId: string
    }) => { success: boolean; callId?: string }

    respondToCall: (data: {
        callId: string
        response: 'accept' | 'decline'
        callerId: string
    }) => { success: boolean }

    endCall: (data: { callId: string; participants: string[] }) => {
        success: boolean
    }
}

export interface SocketIOServerEvents {
    // Connection confirmations
    connected: (data: {
        success: boolean
        message: string
        socketId: string
    }) => void
    authenticated: (data: {
        success: boolean
        userId: string
        userName: string
        message: string
    }) => void
    authenticationError: (data: { success: boolean; message: string }) => void

    // Message events
    newDirectMessage: (data: {
        conversationId: string
        message: any
        sender: {
            uuid: string
            name: string
            avatarUrl?: string
        }
    }) => void

    newGroupMessage: (data: {
        groupId: string
        message: any
        sender: {
            uuid: string
            name: string
            avatarUrl?: string
        }
    }) => void

    // Typing indicators
    userTyping: (data: {
        userId: string
        userName: string
        conversationId?: string
        groupId?: string
        isTyping: boolean
    }) => void

    // Message status
    messagesRead: (data: {
        conversationId: string
        messageIds: string[]
        readBy: {
            uuid: string
            name: string
        }
    }) => void

    groupMessagesRead: (data: {
        groupId: string
        messageIds: string[]
        readBy: {
            uuid: string
            name: string
        }
    }) => void

    // User status updates
    userStatusChanged: (data: {
        userId: string
        status: string
        timestamp: Date
    }) => void

    // Group events
    userJoinedGroup: (data: {
        groupId: string
        user: {
            uuid: string
            name: string
            avatarUrl?: string
        }
    }) => void

    userLeftGroup: (data: {
        groupId: string
        user: {
            uuid: string
            name: string
            avatarUrl?: string
        }
    }) => void

    // Call events
    incomingCall: (data: {
        callId: string
        callType: 'voice' | 'video'
        caller: {
            uuid: string
            name: string
            avatarUrl?: string
        }
        recipientId?: string
        groupId?: string
    }) => void

    callResponse: (data: {
        callId: string
        response: 'accept' | 'decline'
        responder: {
            uuid: string
            name: string
            avatarUrl?: string
        }
    }) => void

    callEnded: (data: {
        callId: string
        endedBy: {
            uuid: string
            name: string
        }
    }) => void

    // Error events
    error: (data: { message: string; code?: string }) => void
}
