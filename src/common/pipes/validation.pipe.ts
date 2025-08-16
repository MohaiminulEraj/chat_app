import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
    PipeTransform
} from '@nestjs/common'
import { plainToClass } from 'class-transformer'
import { validate } from 'class-validator'

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
    async transform(value: any, { metatype }: ArgumentMetadata) {
        if (!metatype || !this.toValidate(metatype)) {
            return value
        }
        const object = plainToClass(metatype, value)
        const errors = await validate(object)
        if (errors.length > 0) {
            // Log detailed validation errors for debugging
            console.error(
                'Validation errors:',
                errors.map((error) => ({
                    property: error.property,
                    value: error.value,
                    constraints: error.constraints
                }))
            )

            const firstError = errors[0]
            const constraints = firstError.constraints
            const constraintKeys = Object.keys(constraints || {})
            const firstConstraintKey = constraintKeys[0]
            const errorMessage =
                constraints?.[firstConstraintKey] || 'Validation failed'

            throw new BadRequestException({
                statusCode: 400,
                message: 'Validation Error',
                errors: errors.map((error) => ({
                    property: error.property,
                    value: error.value,
                    constraints: error.constraints
                })),
                details: `${firstError.property}: ${errorMessage}`
            })
        }
        return value
    }

    private toValidate(metatype: any): boolean {
        const types: any[] = [String, Boolean, Number, Array, Object]
        return !types.includes(metatype)
    }
}
