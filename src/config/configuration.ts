export default () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    database: {
        url: process.env.DATABASE_URL
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-only-for-dev',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
})
