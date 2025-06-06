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
    await app.listen(port)

    console.log(`Application is running on: http://localhost:${port}`)
    console.log(`WebSocket endpoints available at: ws://localhost:${port}`)
}

bootstrap()
