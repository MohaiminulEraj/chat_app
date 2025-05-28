import {
    HttpStatus,
    Logger,
    UnprocessableEntityException,
    ValidationPipe
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ValidationPipe as VP } from 'src/common/pipes/validation.pipe'
import { AppModule } from './app.module'
async function bootstrap() {
    const app = await NestFactory.create(AppModule)

    const configService = app.get(ConfigService)

    const logger = new Logger('Bootstrap')

    app.setGlobalPrefix('api')
    app.useGlobalPipes(new VP())
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            transform: true,
            dismissDefaultMessages: true,
            exceptionFactory: (errors) =>
                new UnprocessableEntityException(errors)
        })
    )
    const apiOptions = {
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        preflightContinue: false,
        optionsSuccessStatus: 204,
        credentials: true
    }

    app.enableCors(apiOptions)

    // SWAGGER CONFIGURATION
    const options = new DocumentBuilder()
        .setTitle('Kitty Project API Docs')
        .setDescription('Kitty API description')
        .setVersion('1.0')
        .addServer('/')
        .addBearerAuth()
        .build()

    const document = SwaggerModule.createDocument(app, options)
    SwaggerModule.setup('/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            filter: true,
            showRequestDuration: true,
            docExpansion: 'none' // This makes all sections collapsed by default
        }
    })

    await app.listen(configService.get<number>('APP_PORT', 3000))
    logger.log(`Server is running on ${process.env.APP_URL}`)
    logger.log(`Swagger UI is available on ${process.env.APP_URL}/docs`)
}
bootstrap()
