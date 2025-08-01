import {
    HttpStatus,
    UnprocessableEntityException,
    ValidationPipe,
    VersioningType,
    Logger
} from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor'
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor'

async function bootstrap() {
    const logger = new Logger('Bootstrap')
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose']
    })

    // Set global prefix
    app.setGlobalPrefix('api/v1')

    // Enable CORS
    app.enableCors({
        origin: true,
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
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
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header'
            }
            // Remove the custom name to use default, since controllers use @ApiBearerAuth() without parameter
        )
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

    // Configure WebSocket adapter with proper CORS settings
    app.useWebSocketAdapter(new IoAdapter(app))

    // Add global interceptors
    app.useGlobalInterceptors(new PerformanceInterceptor())
    app.useGlobalInterceptors(new HttpLoggingInterceptor())

    const port = process.env.PORT || 3000

    // Handle cluster mode properly for PM2
    // In cluster mode, PM2 handles the port binding
    const server = await app.listen(port, '0.0.0.0')

    // Signal to PM2 that the app is ready (important for cluster mode)
    if (process.send) {
        process.send('ready')
    }

    logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`)
    logger.log(`📚 Swagger docs available at: http://localhost:${port}/api`)
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
