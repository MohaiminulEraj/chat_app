#!/usr/bin/env node

/**
 * Simple test script to validate the updated room endpoint
 * Run with: node test-update-room.js
 */

const FormData = require('form-data')
const fs = require('fs')
const path = require('path')

// Configuration
const BASE_URL = 'http://localhost:3000'
const ROOM_ID = 'your-room-id-here'
const JWT_TOKEN = 'your-jwt-token-here'

async function testUpdateRoom() {
    console.log('🧪 Testing Room Update API...\n')

    try {
        // Test 1: Update room name only
        console.log('Test 1: Update room name only')
        const response1 = await updateRoom({ name: 'Test Room Updated' })
        console.log('✅ Success:', response1.status)

        // Test 2: Update multiple fields
        console.log('\nTest 2: Update multiple fields')
        const response2 = await updateRoom({
            name: 'Multi-field Update',
            description: 'Testing multiple field update',
            maxSeats: 10,
            isLocked: true
        })
        console.log('✅ Success:', response2.status)

        // Test 3: Update with file (if image exists)
        const imagePath = path.join(__dirname, 'test-avatar.jpg')
        if (fs.existsSync(imagePath)) {
            console.log('\nTest 3: Update with avatar file')
            const response3 = await updateRoomWithFile({
                name: 'Room with Avatar',
                filePath: imagePath
            })
            console.log('✅ Success:', response3.status)
        } else {
            console.log('\nTest 3: Skipped (no test-avatar.jpg found)')
        }

        console.log('\n🎉 All tests completed successfully!')
    } catch (error) {
        console.error('❌ Test failed:', error.message)
        if (error.response) {
            console.error('Response status:', error.response.status)
            console.error('Response data:', await error.response.text())
        }
    }
}

async function updateRoom(data) {
    const formData = new FormData()

    // Add form fields
    Object.keys(data).forEach((key) => {
        if (data[key] !== undefined) {
            formData.append(key, data[key].toString())
        }
    })

    const response = await fetch(`${BASE_URL}/rooms/${ROOM_ID}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${JWT_TOKEN}`,
            ...formData.getHeaders()
        },
        body: formData
    })

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response
}

async function updateRoomWithFile(data) {
    const formData = new FormData()

    // Add text fields
    Object.keys(data).forEach((key) => {
        if (key !== 'filePath' && data[key] !== undefined) {
            formData.append(key, data[key].toString())
        }
    })

    // Add file if provided
    if (data.filePath) {
        const fileStream = fs.createReadStream(data.filePath)
        formData.append('file', fileStream)
    }

    const response = await fetch(`${BASE_URL}/rooms/${ROOM_ID}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${JWT_TOKEN}`,
            ...formData.getHeaders()
        },
        body: formData
    })

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response
}

// Helper function to create a test image if it doesn't exist
function createTestImage() {
    const imagePath = path.join(__dirname, 'test-avatar.jpg')
    if (!fs.existsSync(imagePath)) {
        console.log('Creating test image...')
        // Create a simple 1x1 pixel JPEG for testing
        const jpegHeader = Buffer.from([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
            0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb,
            0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07,
            0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b,
            0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e,
            0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c,
            0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34,
            0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34,
            0x32, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01,
            0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xc4,
            0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4,
            0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda,
            0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f,
            0x00, 0x9f, 0xff, 0xd9
        ])
        fs.writeFileSync(imagePath, jpegHeader)
        console.log('Test image created:', imagePath)
    }
}

// Usage instructions
if (require.main === module) {
    console.log('📝 Room Update API Test Script\n')
    console.log('Before running, please update the following in the script:')
    console.log('- ROOM_ID: Replace with actual room UUID')
    console.log('- JWT_TOKEN: Replace with valid JWT token')
    console.log('- BASE_URL: Update if using different host/port\n')

    if (
        ROOM_ID === 'your-room-id-here' ||
        JWT_TOKEN === 'your-jwt-token-here'
    ) {
        console.log(
            '❌ Please update ROOM_ID and JWT_TOKEN before running tests'
        )
        process.exit(1)
    }

    // Create test image if needed
    createTestImage()

    // Run tests
    testUpdateRoom()
}

module.exports = {
    testUpdateRoom,
    updateRoom,
    updateRoomWithFile
}
