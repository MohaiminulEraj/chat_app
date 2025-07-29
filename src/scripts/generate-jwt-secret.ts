import * as crypto from 'crypto'

// Generate a secure JWT secret
const generateJwtSecret = () => {
    const secret = crypto.randomBytes(64).toString('base64')
    console.log('Generated JWT Secret:')
    console.log('='.repeat(80))
    console.log(secret)
    console.log('='.repeat(80))
    console.log('\nAdd this to your .env file:')
    console.log(`JWT_SECRET=${secret}`)
    console.log('\nThis secret is 64 bytes (512 bits) encoded in base64.')
}

generateJwtSecret()
