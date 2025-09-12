# PK Battle Real-Time Progress & Highest Sender Events

## Overview

Enhanced PK Battle system with real-time progress tracking and highest gift sender information. These new socket events provide live updates on battle progress percentages and top contributors during active battles.

## New Socket Events

### 1. Real-Time Progress Updates

#### Event: `pkBattleProgressUpdate`

**Automatically emitted when gifts are sent during a battle**

```javascript
// Auto-emitted to room when any gift is sent
socket.on('pkBattleProgressUpdate', (data) => {
    console.log('Battle Progress Update:', data)
    /*
    {
        battleId: 'battle-123',
        progress: {
            leftProgress: 65,     // Left participant winning percentage
            rightProgress: 35,    // Right participant winning percentage
            leftParticipant: {
                userId: 'user-1',
                name: 'Alice',
                avatar: 'avatar-url',
                totalGiftsReceived: 1300,
                giftCount: 15,
                position: 1,
                percentage: 65       // Individual percentage for this participant
            },
            rightParticipant: {
                userId: 'user-2',
                name: 'Bob',
                avatar: 'avatar-url',
                totalGiftsReceived: 700,
                giftCount: 8,
                position: 2,
                percentage: 35       // Individual percentage for this participant
            },
            // Individual percentages for all participants
            participantPercentages: [
                {
                    userId: 'user-1',
                    name: 'Alice',
                    percentage: 65,
                    position: 1
                },
                {
                    userId: 'user-2',
                    name: 'Bob',
                    percentage: 35,
                    position: 2
                }
            ]
        },
        participants: [
            {
                userId: 'user-1',
                name: 'Alice',
                totalGiftsReceived: 1300,
                giftCount: 15
            },
            {
                userId: 'user-2',
                name: 'Bob',
                totalGiftsReceived: 700,
                giftCount: 8
            }
        ],
        totalGiftsValue: 2000,
        updatedAt: '2025-09-10T12:30:45.123Z'
    }
    */
})
```

#### Manual Progress Request: `getPKBattleProgress`

```javascript
// Request current progress
socket.emit('getPKBattleProgress', {
    battleId: 'battle-123'
})

// Response
socket.on('pkBattleProgressResponse', (data) => {
    if (data.status === 'success') {
        console.log('Current Progress:', data.progress)
        console.log('Left Progress:', data.progress.leftProgress + '%')
        console.log('Right Progress:', data.progress.rightProgress + '%')
        console.log('Remaining Time:', data.remainingTime, 'seconds')

        // Access individual participant percentages
        data.progress.participantPercentages.forEach((participant) => {
            console.log(`${participant.name}: ${participant.percentage}%`)
        })

        // Or access individual participant percentage directly
        console.log(
            'Left participant percentage:',
            data.progress.leftParticipant?.percentage + '%'
        )
        console.log(
            'Right participant percentage:',
            data.progress.rightParticipant?.percentage + '%'
        )
    }
})
```

### 2. Highest Gift Sender Tracking

#### Event: `pkBattleHighestSender`

**Automatically emitted when gifts are sent during a battle**

```javascript
// Auto-emitted to room when gift rankings change
socket.on('pkBattleHighestSender', (data) => {
    console.log('Highest Sender Update:', data)
    /*
    {
        battleId: 'battle-123',
        roomId: 'room-456',
        highestGroupSender: {
            senderId: 'sender-789',
            name: 'Charlie',
            avatar: 'avatar-url',
            totalValue: 2500,
            giftCount: 25
        },
        totalSenders: 12,
        allSenders: [
            {
                senderId: 'sender-789',
                senderName: 'Charlie',
                senderAvatar: 'avatar-url',
                totalValue: 2500,
                giftCount: 25
            },
            {
                senderId: 'sender-456',
                senderName: 'David',
                senderAvatar: 'avatar-url',
                totalValue: 1800,
                giftCount: 18
            }
            // ... more senders sorted by total value
        ],
        updatedAt: '2025-09-10T12:30:45.123Z'
    }
    */
})
```

#### Manual Highest Sender Request: `getPKBattleHighestSender`

```javascript
// Request current highest sender
socket.emit('getPKBattleHighestSender', {
    battleId: 'battle-123'
})

// Response
socket.on('pkBattleHighestSenderResponse', (data) => {
    if (data.status === 'success') {
        console.log('Highest Sender:', data.highestGroupSender)
        console.log('Total Senders:', data.totalSenders)
        console.log('All Senders Ranking:', data.allSenders)
    }
})
```

## Progress Calculation Logic

### Percentage Calculation

```typescript
// Two-participant battle progress calculation
const totalGiftsValue =
    participant1.totalGiftsReceived + participant2.totalGiftsReceived

if (totalGiftsValue > 0) {
    leftProgress = Math.round(
        (participant1.totalGiftsReceived / totalGiftsValue) * 100
    )
    rightProgress = Math.round(
        (participant2.totalGiftsReceived / totalGiftsValue) * 100
    )
} else {
    // Equal at start
    leftProgress = 50
    rightProgress = 50
}
```

### Participant Assignment

- **Left Participant**: Currently leading participant (highest gifts received)
- **Right Participant**: Currently second participant
- **Progress**: Percentage based on total gift values received by each participant

## Integration Examples

### 1. Individual Participant Percentages Display

```javascript
// Display all participant percentages
socket.on('pkBattleProgressUpdate', (data) => {
    const { participantPercentages } = data.progress

    // Create individual percentage displays for each participant
    const participantList = document.getElementById('participantsList')
    participantList.innerHTML = ''

    participantPercentages.forEach(participant => {
        const participantDiv = document.createElement('div')
        participantDiv.className = 'participant-item'
        participantDiv.innerHTML = `
            <div class="participant-info">
                <span class="name">${participant.name}</span>
                <span class="position">#${participant.position}</span>
            </div>
            <div class="percentage-bar">
                <div class="percentage-fill" style="width: ${participant.percentage}%"></div>
                <span class="percentage-text">${participant.percentage}%</span>
            </div>
        `
        participantList.appendChild(participantDiv)
    })
})

// CSS for styling
.participant-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    margin: 5px 0;
    background: #f5f5f5;
    border-radius: 8px;
}

.percentage-bar {
    position: relative;
    width: 150px;
    height: 20px;
    background: #e0e0e0;
    border-radius: 10px;
    overflow: hidden;
}

.percentage-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
    transition: width 0.3s ease;
}

.percentage-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 12px;
    font-weight: bold;
    color: #333;
}
```

### 2. Real-Time Progress Bar (Left vs Right)

```javascript
// HTML Progress Bar
;<div class="battle-progress">
    <div class="left-progress" id="leftProgress" style="width: 50%">
        <span id="leftName">Loading...</span>
        <span id="leftPercentage">50%</span>
    </div>
    <div class="right-progress" id="rightProgress" style="width: 50%">
        <span id="rightName">Loading...</span>
        <span id="rightPercentage">50%</span>
    </div>
</div>

// JavaScript Update
socket.on('pkBattleProgressUpdate', (data) => {
    const { leftProgress, rightProgress, leftParticipant, rightParticipant } =
        data.progress

    // Update progress bars
    document.getElementById('leftProgress').style.width = leftProgress + '%'
    document.getElementById('rightProgress').style.width = rightProgress + '%'

    // Update participant info
    document.getElementById('leftName').textContent =
        leftParticipant?.name || 'Player 1'
    document.getElementById('rightName').textContent =
        rightParticipant?.name || 'Player 2'
    document.getElementById('leftPercentage').textContent =
        leftParticipant?.percentage + '%'
    document.getElementById('rightPercentage').textContent =
        rightParticipant?.percentage + '%'

    // Add animation effects
    animateProgressChange(leftProgress, rightProgress)
})
```

### 3. Highest Sender Leaderboard

```javascript
// HTML Leaderboard
<div class="highest-senders">
    <h3>Top Gift Senders</h3>
    <div id="highestSender" class="top-sender">
        <img id="topSenderAvatar" src="" alt="Top Sender">
        <div>
            <span id="topSenderName">Loading...</span>
            <span id="topSenderValue">$0</span>
        </div>
    </div>
    <ul id="sendersList"></ul>
</div>

// JavaScript Update
socket.on('pkBattleHighestSender', (data) => {
    const { highestGroupSender, allSenders } = data

    if (highestGroupSender) {
        // Update top sender
        document.getElementById('topSenderAvatar').src = highestGroupSender.avatar || '/default-avatar.png'
        document.getElementById('topSenderName').textContent = highestGroupSender.name
        document.getElementById('topSenderValue').textContent = `$${highestGroupSender.totalValue}`

        // Update leaderboard
        const sendersList = document.getElementById('sendersList')
        sendersList.innerHTML = ''

        allSenders.slice(1, 6).forEach((sender, index) => {
            const li = document.createElement('li')
            li.innerHTML = `
                <span class="rank">#${index + 2}</span>
                <span class="name">${sender.senderName}</span>
                <span class="value">$${sender.totalValue}</span>
            `
            sendersList.appendChild(li)
        })
    }
})
```

### 3. Live Battle Dashboard

```javascript
class PKBattleDashboard {
    constructor(battleId) {
        this.battleId = battleId
        this.setupEventListeners()
        this.requestInitialData()
    }

    setupEventListeners() {
        // Real-time progress updates
        socket.on('pkBattleProgressUpdate', (data) => {
            if (data.battleId === this.battleId) {
                this.updateProgress(data.progress)
                this.updateParticipantStats(data.participants)
            }
        })

        // Real-time highest sender updates
        socket.on('pkBattleHighestSender', (data) => {
            if (data.battleId === this.battleId) {
                this.updateHighestSender(data.highestGroupSender)
                this.updateSendersLeaderboard(data.allSenders)
            }
        })

        // Gift received events
        socket.on('pkBattleGiftReceived', (data) => {
            if (data.battleId === this.battleId) {
                this.animateGiftReceived(data.gift)
            }
        })
    }

    requestInitialData() {
        // Get current progress
        socket.emit('getPKBattleProgress', { battleId: this.battleId })

        // Get current highest sender
        socket.emit('getPKBattleHighestSender', { battleId: this.battleId })
    }

    updateProgress({
        leftProgress,
        rightProgress,
        leftParticipant,
        rightParticipant
    }) {
        // Update UI with smooth animations
        this.animateProgressBar('left', leftProgress, leftParticipant)
        this.animateProgressBar('right', rightProgress, rightParticipant)
    }

    updateHighestSender(highestSender) {
        if (highestSender) {
            // Update crown icon position
            this.showHighestSenderCrown(highestSender.senderId)

            // Update highest sender display
            this.displayHighestSender(highestSender)
        }
    }

    animateGiftReceived(gift) {
        // Create flying gift animation
        this.createGiftAnimation(
            gift.senderId,
            gift.receiverId,
            gift.giftImageUrl
        )

        // Show gift notification
        this.showGiftNotification(gift)
    }
}

// Initialize dashboard
const battleDashboard = new PKBattleDashboard('battle-123')
```

## Event Flow Diagram

```
Gift Sent → Update Database → Calculate Progress → Emit Events
                                      ↓
                            ┌─────────────────────┐
                            │                     │
                            ▼                     ▼
                  pkBattleProgressUpdate   pkBattleHighestSender
                            │                     │
                            ▼                     ▼
                    Update Progress Bar    Update Leaderboard
                    Update Percentages     Update Top Sender
```

## Error Handling

```javascript
// Handle connection errors
socket.on('pkBattleProgressResponse', (data) => {
    if (data.status === 'error') {
        console.error('Progress Error:', data.message)
        showErrorMessage('Unable to load battle progress')
    }
})

socket.on('pkBattleHighestSenderResponse', (data) => {
    if (data.status === 'error') {
        console.error('Highest Sender Error:', data.message)
        showErrorMessage('Unable to load sender rankings')
    }
})

// Fallback for disconnection
socket.on('disconnect', () => {
    // Show offline indicator
    showOfflineIndicator()

    // Attempt to reconnect and refresh data
    setTimeout(() => {
        if (socket.connected) {
            battleDashboard.requestInitialData()
        }
    }, 2000)
})
```

## Performance Considerations

### 1. Real-Time Updates

- Events are only emitted when gift values change
- Progress calculations are optimized for 2-participant battles
- Sender rankings are cached and updated incrementally

### 2. Data Efficiency

- Only essential data is included in real-time events
- Full battle details available via dedicated request endpoints
- Client-side caching recommended for participant info

### 3. Rate Limiting

- Consider implementing rate limiting for rapid gift sending
- Batch progress updates for multiple simultaneous gifts
- Use debouncing for UI updates to prevent excessive animations

## Frontend Implementation Tips

### 1. Smooth Animations

```css
.progress-bar {
    transition: width 0.3s ease-in-out;
}

.gift-animation {
    animation: flyGift 1s ease-out;
}

@keyframes flyGift {
    0% {
        transform: scale(1) translateY(0);
        opacity: 1;
    }
    50% {
        transform: scale(1.2) translateY(-20px);
        opacity: 0.8;
    }
    100% {
        transform: scale(0.8) translateY(-40px);
        opacity: 0;
    }
}
```

### 2. State Management

```javascript
// React/Vue state management
const [battleProgress, setBattleProgress] = useState({
    leftProgress: 50,
    rightProgress: 50,
    leftParticipant: null,
    rightParticipant: null
})

const [highestSender, setHighestSender] = useState(null)

useEffect(() => {
    socket.on('pkBattleProgressUpdate', (data) => {
        setBattleProgress(data.progress)
    })

    socket.on('pkBattleHighestSender', (data) => {
        setHighestSender(data.highestGroupSender)
    })

    return () => {
        socket.off('pkBattleProgressUpdate')
        socket.off('pkBattleHighestSender')
    }
}, [])
```

## Testing Examples

### 1. Manual Testing

```javascript
// Simulate gift sending
async function testGiftFlow() {
    // Send gift
    socket.emit('sendPKBattleGift', {
        battleId: 'test-battle',
        giftId: 'gift-123',
        receiverId: 'participant-1',
        quantity: 2,
        message: 'Good luck!'
    })

    // Verify progress update received
    await new Promise((resolve) => {
        socket.once('pkBattleProgressUpdate', (data) => {
            console.log('Progress updated:', data.progress)
            resolve()
        })
    })

    // Verify highest sender update
    await new Promise((resolve) => {
        socket.once('pkBattleHighestSender', (data) => {
            console.log('Highest sender:', data.highestGroupSender)
            resolve()
        })
    })
}
```

### 2. Automated Testing

```javascript
describe('PK Battle Real-Time Events', () => {
    it('should emit progress updates when gifts are sent', (done) => {
        socket.emit('sendPKBattleGift', testGiftData)

        socket.once('pkBattleProgressUpdate', (data) => {
            expect(data.battleId).toBe(testBattleId)
            expect(data.progress.leftProgress).toBeGreaterThan(0)
            expect(data.progress.rightProgress).toBeGreaterThan(0)
            expect(
                data.progress.leftProgress + data.progress.rightProgress
            ).toBe(100)
            done()
        })
    })

    it('should track highest sender correctly', (done) => {
        socket.once('pkBattleHighestSender', (data) => {
            expect(data.highestGroupSender).toBeDefined()
            expect(data.highestGroupSender.totalValue).toBeGreaterThan(0)
            expect(data.allSenders).toBeInstanceOf(Array)
            done()
        })
    })
})
```

This comprehensive real-time system provides engaging live feedback for PK Battle participants and spectators, creating a dynamic and competitive environment with instant progress visualization and recognition for top contributors.
