import {
    HttpStatus,
    UnprocessableEntityException,
    ValidationPipe,
    VersioningType
} from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor'

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose']
    })

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            transformOptions: {
                enableImplicitConversion: true
            },
            exceptionFactory: (errors) =>
                new UnprocessableEntityException(errors)
        })
    )

    // API Versioning
    app.setGlobalPrefix('api')
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1'
    })

    // SWAGGER CONFIGURATION
    const options = new DocumentBuilder()
        .setTitle('Kitty Project API Docs')
        .setDescription('Kitty API description')
        .setVersion('1.0')
        .addServer('/')
        .addBearerAuth()
        .build()

    const document = SwaggerModule.createDocument(app, options)
    SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            filter: true,
            showRequestDuration: true,
            docExpansion: 'none' // This makes all sections collapsed by default
        }
    })

    // Enable CORS for all origins
    app.enableCors({
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })

    // Configure WebSocket adapter with proper CORS settings
    app.useWebSocketAdapter(new IoAdapter(app))

    // Add global interceptors
    app.useGlobalInterceptors(new PerformanceInterceptor())

    const port = process.env.PORT || 3000

    // Handle cluster mode properly for PM2
    // In cluster mode, PM2 handles the port binding
    const server = await app.listen(port, '0.0.0.0')

    // Signal to PM2 that the app is ready (important for cluster mode)
    if (process.send) {
        process.send('ready')
    }

    console.log(`Application is running on: http://localhost:${port}`)
    console.log(`Process ID: ${process.pid}`)
    console.log(`WebSocket endpoints available at: ws://localhost:${port}`)

    // Graceful shutdown handling for PM2
    process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...')
        await app.close()
        process.exit(0)
    })

    process.on('SIGTERM', async () => {
        console.log('Received SIGTERM, shutting down gracefully...')
        await app.close()
        process.exit(0)
    })

    return { app, server }
}

bootstrap().catch((error) => {
    console.error('Error starting application:', error)
    process.exit(1)
})
