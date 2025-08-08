// Simple test for token extraction logic
const sampleToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXVpZCI6ImI5NTNmMmZjLThlNjQtNDRhNS1iMGIwLWExOWFiZGFiODZiZCIsImVtYWlsIjoiZXJhakBnbWFpbC5jb20iLCJpYXQiOjE3NTQ2NTI5MjYsImV4cCI6MTc1NTI1NzcyNn0.JR6aPRaIYd4r_baae8IiY29m2Pr9-5U_A7F0UQaoQ1c'

function extractTokenFromUrl(url) {
    try {
        console.log(`🔍 [TOKEN] Extracting token from URL: ${url}`)

        // Handle both query params and path-based tokens
        const urlParts = url.split('/')

        // Check if token is in the path (last segment)
        const lastSegment = urlParts[urlParts.length - 1]
        if (lastSegment && lastSegment.startsWith('eyJ')) {
            console.log(
                `🎯 [TOKEN] Found token in URL path: ${lastSegment.substring(0, 20)}...`
            )
            return lastSegment
        }

        // Also check for token in query parameters
        if (url.includes('?')) {
            const queryString = url.split('?')[1]
            const params = new URLSearchParams(queryString)
            const queryToken =
                params.get('token') || params.get('auth') || params.get('jwt')

            if (queryToken && queryToken.startsWith('eyJ')) {
                console.log(
                    `🎯 [TOKEN] Found token in query params: ${queryToken.substring(0, 20)}...`
                )
                return queryToken
            }
        }

        console.log(`⚠️ [TOKEN] No valid JWT token found in URL`)
        return null
    } catch (error) {
        console.warn(
            `❌ [TOKEN] Failed to extract token from URL: ${error.message}`
        )
        return null
    }
}

// Test cases
console.log('=== Token Extraction Tests ===\n')

// Test 1: Flutter client URL pattern (token in path)
const flutterUrl = `http://103.190.136.200:3000/${sampleToken}`
console.log('Test 1: Flutter client URL pattern')
const result1 = extractTokenFromUrl(flutterUrl)
console.log(`Result: ${result1 ? 'SUCCESS' : 'FAILED'}\n`)

// Test 2: Query parameter pattern
const queryUrl = `http://103.190.136.200:3000?token=${sampleToken}`
console.log('Test 2: Query parameter pattern')
const result2 = extractTokenFromUrl(queryUrl)
console.log(`Result: ${result2 ? 'SUCCESS' : 'FAILED'}\n`)

// Test 3: No token
const noTokenUrl = 'http://103.190.136.200:3000'
console.log('Test 3: No token URL')
const result3 = extractTokenFromUrl(noTokenUrl)
console.log(`Result: ${result3 === null ? 'SUCCESS' : 'FAILED'}\n`)

// Test 4: Socket.IO path with token
const socketIOUrl = `/socket.io/?EIO=4&transport=websocket&t=123/${sampleToken}`
console.log('Test 4: Socket.IO path with token')
const result4 = extractTokenFromUrl(socketIOUrl)
console.log(`Result: ${result4 ? 'SUCCESS' : 'FAILED'}\n`)

console.log('=== All Tests Complete ===')
