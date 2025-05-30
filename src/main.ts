import {
    HttpStatus,
    UnprocessableEntityException,
    ValidationPipe,
    VersioningType
} from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
async function bootstrap() {
    const app = await NestFactory.create(AppModule)

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
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true
    })

    const port = process.env.PORT || 3000
    await app.listen(port)

    console.log(`🚀 Application is running on: http://localhost:${port}`)
    console.log(
        `📚 API Documentation available at: http://localhost:${port}/docs`
    )
}

bootstrap()
