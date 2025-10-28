import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    HttpStatus,
    HttpCode
} from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth
} from '@nestjs/swagger'
import { CountryService } from './country.service'
import { CreateCountryDto } from './dto/create-country.dto'
import { UpdateCountryDto } from './dto/update-country.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'

@ApiTags('Countries')
@Controller('countries')
export class CountryController {
    constructor(private readonly countryService: CountryService) {}

    @Post()
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new country (Admin only)' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Country created successfully'
    })
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createCountryDto: CreateCountryDto) {
        const country = await this.countryService.create(createCountryDto)
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Country created successfully',
            data: country
        }
    }

    @Get()
    @ApiOperation({ summary: 'Get all countries' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns all countries'
    })
    async findAll() {
        const countries = await this.countryService.findAll()
        return {
            statusCode: HttpStatus.OK,
            message: 'Countries fetched successfully',
            data: countries
        }
    }

    @Get('active')
    @ApiOperation({ summary: 'Get active countries only' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns active countries'
    })
    async findActive() {
        const countries = await this.countryService.findActive()
        return {
            statusCode: HttpStatus.OK,
            message: 'Active countries fetched successfully',
            data: countries
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get country by ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns country details'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Country not found'
    })
    async findOne(@Param('id') id: string) {
        const country = await this.countryService.findOne(id)
        return {
            statusCode: HttpStatus.OK,
            message: 'Country fetched successfully',
            data: country
        }
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a country (Admin only)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Country updated successfully'
    })
    async update(
        @Param('id') id: string,
        @Body() updateCountryDto: UpdateCountryDto
    ) {
        const country = await this.countryService.update(id, updateCountryDto)
        return {
            statusCode: HttpStatus.OK,
            message: 'Country updated successfully',
            data: country
        }
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a country (Admin only)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Country deleted successfully'
    })
    async remove(@Param('id') id: string) {
        await this.countryService.remove(id)
        return {
            statusCode: HttpStatus.OK,
            message: 'Country deleted successfully',
            data: null
        }
    }

    @Post('seed')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Seed countries database (Admin only)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Countries seeded successfully'
    })
    @HttpCode(HttpStatus.OK)
    async seed() {
        await this.countryService.seedCountries()
        return {
            statusCode: HttpStatus.OK,
            message: 'Countries seeded successfully',
            data: null
        }
    }
}
