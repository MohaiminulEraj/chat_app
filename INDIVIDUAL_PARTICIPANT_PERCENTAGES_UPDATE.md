# Individual Participant Percentages Update

## Overview

Enhanced the `getPKBattleProgress` functionality to include individual percentage calculations for each participant in PK battles. This provides more granular insights into individual performance beyond just the left/right comparison.

## Changes Made

### 1. Enhanced `getPKBattleDetails` Method

**File**: `src/modules/room/room.service.ts`

#### Key Modifications:

- **Individual Percentage Calculation**: Each participant now receives their own percentage based on their gifts received vs total battle value
- **Enhanced Participant Data**: Added `percentage` field to each participant object
- **Improved Progress Object**: Added `participantPercentages` array for easier access to all individual percentages

#### New Response Structure:

```typescript
{
    // ... existing fields
    participants: [
        {
            userId: 'user-1',
            position: 1,
            name: 'Alice',
            avatar: 'avatar-url',
            totalGiftsReceived: 1300,
            giftCount: 15,
            status: 'ACCEPTED',
            percentage: 65  // ← NEW: Individual participant percentage
        },
        // ... more participants
    ],
    progress: {
        leftProgress: 65,      // Left vs Right comparison (unchanged)
        rightProgress: 35,     // Left vs Right comparison (unchanged)
        leftParticipant: { ... },
        rightParticipant: { ... },
        // ← NEW: Array of all participant percentages
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
    }
}
```

### 2. Updated Documentation

**File**: `PK_BATTLE_REALTIME_EVENTS.md`

#### Enhancements:

- **Real-time Event Examples**: Updated `pkBattleProgressUpdate` examples to show individual percentages
- **Individual Percentage Display**: Added complete implementation example for displaying all participant percentages
- **Enhanced Progress Response**: Updated `pkBattleProgressResponse` examples with new fields
- **CSS Styling**: Added styling examples for individual percentage bars

## Use Cases

### 1. Multi-Participant Battles

Now supports showing individual percentages for battles with more than 2 participants:

```javascript
// Example: 3-participant battle
participantPercentages: [
    { userId: 'user-1', name: 'Alice', percentage: 50, position: 1 },
    { userId: 'user-2', name: 'Bob', percentage: 30, position: 2 },
    { userId: 'user-3', name: 'Charlie', percentage: 20, position: 3 }
]
```

### 2. Individual Performance Tracking

```javascript
socket.on('pkBattleProgressUpdate', (data) => {
    data.progress.participantPercentages.forEach((participant) => {
        updateParticipantUI(participant.userId, participant.percentage)
    })
})
```

### 3. Granular Analytics

Frontend can now display:

- Individual progress bars for each participant
- Real-time ranking based on percentages
- Detailed performance breakdowns
- Visual indicators for performance gaps

## Frontend Integration

### Individual Percentage Bars

```html
<div id="participantsList">
    <!-- Dynamically populated with individual percentage bars -->
</div>
```

```javascript
function updateIndividualPercentages(participantPercentages) {
    const container = document.getElementById('participantsList')
    container.innerHTML = ''

    participantPercentages.forEach((participant) => {
        const div = document.createElement('div')
        div.innerHTML = `
            <span>${participant.name}</span>
            <div class="progress-bar">
                <div class="fill" style="width: ${participant.percentage}%"></div>
                <span>${participant.percentage}%</span>
            </div>
        `
        container.appendChild(div)
    })
}
```

## Technical Details

### Calculation Logic

```typescript
const individualPercentage =
    totalGiftsValue > 0
        ? Math.round((participant.totalGiftsReceived / totalGiftsValue) * 100)
        : 0
```

### Backward Compatibility

- All existing `leftProgress` and `rightProgress` functionality remains unchanged
- New fields are additive, not replacing existing structure
- Frontend can choose to use individual percentages or stick with left/right comparison

## Benefits

1. **Enhanced User Experience**: More detailed visual feedback for participants
2. **Better Competition Dynamics**: Clear individual performance metrics
3. **Scalable for Multi-Participant**: Works for 2+ participant battles
4. **Real-time Granularity**: Instant individual percentage updates
5. **Flexible Frontend Implementation**: Multiple display options available

## Testing

The changes have been:

- ✅ Successfully compiled with TypeScript
- ✅ Validated with no build errors
- ✅ Documented with implementation examples
- ✅ Backward compatible with existing functionality

## Next Steps

Frontend teams can now implement:

1. Individual participant percentage displays
2. Enhanced ranking visualizations
3. Real-time individual progress tracking
4. Detailed performance analytics dashboards

All changes maintain full backward compatibility while adding powerful new individual tracking capabilities.
