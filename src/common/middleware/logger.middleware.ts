import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import * as chalk from 'chalk'
import { NextFunction, Response } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private logger = new Logger('HTTP')
    private readonly slowRequestThreshold = 1000 // 1 second in milliseconds

    use(request: any, response: Response, next: NextFunction): void {
        const { ip, method, originalUrl } = request
        const userAgent = request.get('user-agent') || ''
        const start = process.hrtime()
        const startTime = new Date()

        // Log incoming request (user not available yet)
        this.logger.log(
            `➡️  ${chalk.yellow(method)} ${chalk.cyan(originalUrl)} - ${chalk.gray(ip)}`
        )

        // Log request body for POST/PUT/PATCH (excluding sensitive data)
        if (['POST', 'PUT', 'PATCH'].includes(method) && request.body) {
            const sanitizedBody = this.sanitizeBody(request.body)
            if (Object.keys(sanitizedBody).length > 0) {
                this.logger.debug(
                    `Request Body: ${JSON.stringify(sanitizedBody)}`
                )
            }
        }

        response.on('finish', () => {
            const { statusCode } = response
            const contentLength = response.get('content-length')
            const diff = process.hrtime(start)
            const responseTime = diff[0] * 1e3 + diff[1] * 1e-6 // Convert to milliseconds

            // Now we can get the user info after auth middleware has run
            const userId = request['user']?.email || 'anonymous'

            // Color code based on status
            const statusColor = this.getStatusColor(statusCode)
            const timeColor =
                responseTime > this.slowRequestThreshold
                    ? chalk.red
                    : chalk.green

            // Build log message with user info
            const logMessage = [
                `⬅️  ${chalk.yellow(method)}`,
                chalk.cyan(originalUrl),
                statusColor(statusCode.toString()),
                timeColor(`${responseTime.toFixed(2)}ms`),
                chalk.gray(`${contentLength || '-'} bytes`),
                chalk.gray(`User: ${userId}`),
                chalk.gray(ip)
            ].join(' ')

            this.logger.log(logMessage)

            // Log slow requests with additional details
            if (responseTime > this.slowRequestThreshold) {
                this.logger.warn(
                    chalk.red(`🐌 SLOW REQUEST DETECTED!`) +
                        '\n' +
                        chalk.yellow(`  Method: ${method}`) +
                        '\n' +
                        chalk.yellow(`  URL: ${originalUrl}`) +
                        '\n' +
                        chalk.yellow(
                            `  Response Time: ${responseTime.toFixed(2)}ms`
                        ) +
                        '\n' +
                        chalk.yellow(`  User: ${userId}`) +
                        '\n' +
                        chalk.yellow(`  User-Agent: ${userAgent}`) +
                        '\n' +
                        chalk.yellow(`  Timestamp: ${startTime.toISOString()}`)
                )

                // You could also emit metrics here for monitoring tools
                this.emitSlowRequestMetric({
                    method,
                    url: originalUrl,
                    responseTime,
                    userId,
                    timestamp: startTime
                })
            }

            // Log errors with request details
            if (statusCode >= 400) {
                this.logger.error(
                    chalk.red(`❌ ERROR RESPONSE`) +
                        '\n' +
                        chalk.red(`  Status: ${statusCode}`) +
                        '\n' +
                        chalk.red(`  Method: ${method}`) +
                        '\n' +
                        chalk.red(`  URL: ${originalUrl}`) +
                        '\n' +
                        chalk.red(`  User: ${userId}`) +
                        '\n' +
                        chalk.red(
                            `  Response Time: ${responseTime.toFixed(2)}ms`
                        )
                )
            }
        })

        next()
    }

    private sanitizeBody(body: any): any {
        const sensitiveFields = [
            'password',
            'token',
            'secret',
            'authorization',
            'credit_card'
        ]
        const sanitized = { ...body }

        Object.keys(sanitized).forEach((key) => {
            if (
                sensitiveFields.some((field) =>
                    key.toLowerCase().includes(field)
                )
            ) {
                sanitized[key] = '[REDACTED]'
            } else if (
                typeof sanitized[key] === 'object' &&
                sanitized[key] !== null
            ) {
                sanitized[key] = this.sanitizeBody(sanitized[key])
            }
        })

        return sanitized
    }

    private getStatusColor(statusCode: number): (text: string) => string {
        if (statusCode >= 500) return chalk.red
        if (statusCode >= 400) return chalk.yellow
        if (statusCode >= 300) return chalk.cyan
        if (statusCode >= 200) return chalk.green
        return chalk.white
    }

    private emitSlowRequestMetric(data: {
        method: string
        url: string
        responseTime: number
        userId: string
        timestamp: Date
    }): void {
        // This is where you could send metrics to monitoring services
        // like DataDog, New Relic, or custom metrics collection
        // For now, we'll just log it as a metric
        this.logger.debug(`[METRIC] slow_request: ${JSON.stringify(data)}`)
    }
}
