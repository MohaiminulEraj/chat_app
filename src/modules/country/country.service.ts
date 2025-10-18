import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Country } from './entities/country.entity'
import { CreateCountryDto } from './dto/create-country.dto'
import { UpdateCountryDto } from './dto/update-country.dto'

@Injectable()
export class CountryService {
    constructor(
        @InjectRepository(Country)
        private countryRepository: Repository<Country>
    ) {}

    async create(createCountryDto: CreateCountryDto): Promise<Country> {
        const country = this.countryRepository.create(createCountryDto)
        return await this.countryRepository.save(country)
    }

    async findAll(): Promise<Country[]> {
        return await this.countryRepository.find({
            order: {
                displayOrder: 'ASC',
                name: 'ASC'
            }
        })
    }

    async findActive(): Promise<Country[]> {
        return await this.countryRepository.find({
            where: { isActive: true },
            order: {
                displayOrder: 'ASC',
                name: 'ASC'
            }
        })
    }

    async findOne(id: string): Promise<Country> {
        const country = await this.countryRepository.findOne({
            where: { uuid: id }
        })

        if (!country) {
            throw new NotFoundException(`Country with ID ${id} not found`)
        }

        return country
    }

    async findByCode(code: string): Promise<Country | null> {
        return await this.countryRepository.findOne({
            where: { code: code.toUpperCase() }
        })
    }

    async update(
        id: string,
        updateCountryDto: UpdateCountryDto
    ): Promise<Country> {
        const country = await this.findOne(id)
        Object.assign(country, updateCountryDto)
        return await this.countryRepository.save(country)
    }

    async remove(id: string): Promise<void> {
        const country = await this.findOne(id)
        await this.countryRepository.remove(country)
    }

    async seedCountries(): Promise<void> {
        const countries = [
            // Top priority countries (most commonly used)
            {
                name: 'United States',
                code: 'USA',
                emoji: '🇺🇸',
                flagUrl: 'https://flagcdn.com/w320/us.png',
                phoneCode: '+1',
                displayOrder: 1
            },
            {
                name: 'United Kingdom',
                code: 'GBR',
                emoji: '🇬🇧',
                flagUrl: 'https://flagcdn.com/w320/gb.png',
                phoneCode: '+44',
                displayOrder: 2
            },
            {
                name: 'Canada',
                code: 'CAN',
                emoji: '🇨🇦',
                flagUrl: 'https://flagcdn.com/w320/ca.png',
                phoneCode: '+1',
                displayOrder: 3
            },
            {
                name: 'Australia',
                code: 'AUS',
                emoji: '🇦🇺',
                flagUrl: 'https://flagcdn.com/w320/au.png',
                phoneCode: '+61',
                displayOrder: 4
            },
            {
                name: 'Germany',
                code: 'DEU',
                emoji: '🇩🇪',
                flagUrl: 'https://flagcdn.com/w320/de.png',
                phoneCode: '+49',
                displayOrder: 5
            },
            {
                name: 'France',
                code: 'FRA',
                emoji: '🇫🇷',
                flagUrl: 'https://flagcdn.com/w320/fr.png',
                phoneCode: '+33',
                displayOrder: 6
            },
            {
                name: 'India',
                code: 'IND',
                emoji: '🇮🇳',
                flagUrl: 'https://flagcdn.com/w320/in.png',
                phoneCode: '+91',
                displayOrder: 7
            },
            {
                name: 'China',
                code: 'CHN',
                emoji: '🇨🇳',
                flagUrl: 'https://flagcdn.com/w320/cn.png',
                phoneCode: '+86',
                displayOrder: 8
            },
            {
                name: 'Japan',
                code: 'JPN',
                emoji: '🇯🇵',
                flagUrl: 'https://flagcdn.com/w320/jp.png',
                phoneCode: '+81',
                displayOrder: 9
            },
            {
                name: 'South Korea',
                code: 'KOR',
                emoji: '🇰🇷',
                flagUrl: 'https://flagcdn.com/w320/kr.png',
                phoneCode: '+82',
                displayOrder: 10
            },
            {
                name: 'Brazil',
                code: 'BRA',
                emoji: '🇧🇷',
                flagUrl: 'https://flagcdn.com/w320/br.png',
                phoneCode: '+55',
                displayOrder: 11
            },
            {
                name: 'Mexico',
                code: 'MEX',
                emoji: '🇲🇽',
                flagUrl: 'https://flagcdn.com/w320/mx.png',
                phoneCode: '+52',
                displayOrder: 12
            },
            {
                name: 'Spain',
                code: 'ESP',
                emoji: '🇪🇸',
                flagUrl: 'https://flagcdn.com/w320/es.png',
                phoneCode: '+34',
                displayOrder: 13
            },
            {
                name: 'Italy',
                code: 'ITA',
                emoji: '🇮🇹',
                flagUrl: 'https://flagcdn.com/w320/it.png',
                phoneCode: '+39',
                displayOrder: 14
            },
            {
                name: 'Netherlands',
                code: 'NLD',
                emoji: '🇳🇱',
                flagUrl: 'https://flagcdn.com/w320/nl.png',
                phoneCode: '+31',
                displayOrder: 15
            },
            {
                name: 'Russia',
                code: 'RUS',
                emoji: '🇷🇺',
                flagUrl: 'https://flagcdn.com/w320/ru.png',
                phoneCode: '+7',
                displayOrder: 16
            },
            {
                name: 'Turkey',
                code: 'TUR',
                emoji: '🇹🇷',
                flagUrl: 'https://flagcdn.com/w320/tr.png',
                phoneCode: '+90',
                displayOrder: 17
            },
            {
                name: 'Saudi Arabia',
                code: 'SAU',
                emoji: '🇸🇦',
                flagUrl: 'https://flagcdn.com/w320/sa.png',
                phoneCode: '+966',
                displayOrder: 18
            },
            {
                name: 'United Arab Emirates',
                code: 'ARE',
                emoji: '🇦🇪',
                flagUrl: 'https://flagcdn.com/w320/ae.png',
                phoneCode: '+971',
                displayOrder: 19
            },
            {
                name: 'Indonesia',
                code: 'IDN',
                emoji: '🇮🇩',
                flagUrl: 'https://flagcdn.com/w320/id.png',
                phoneCode: '+62',
                displayOrder: 20
            },
            {
                name: 'Thailand',
                code: 'THA',
                emoji: '🇹🇭',
                flagUrl: 'https://flagcdn.com/w320/th.png',
                phoneCode: '+66',
                displayOrder: 21
            },
            {
                name: 'Vietnam',
                code: 'VNM',
                emoji: '🇻🇳',
                flagUrl: 'https://flagcdn.com/w320/vn.png',
                phoneCode: '+84',
                displayOrder: 22
            },
            {
                name: 'Philippines',
                code: 'PHL',
                emoji: '🇵🇭',
                flagUrl: 'https://flagcdn.com/w320/ph.png',
                phoneCode: '+63',
                displayOrder: 23
            },
            {
                name: 'Malaysia',
                code: 'MYS',
                emoji: '🇲🇾',
                flagUrl: 'https://flagcdn.com/w320/my.png',
                phoneCode: '+60',
                displayOrder: 24
            },
            {
                name: 'Singapore',
                code: 'SGP',
                emoji: '🇸🇬',
                flagUrl: 'https://flagcdn.com/w320/sg.png',
                phoneCode: '+65',
                displayOrder: 25
            },
            {
                name: 'Pakistan',
                code: 'PAK',
                emoji: '🇵🇰',
                flagUrl: 'https://flagcdn.com/w320/pk.png',
                phoneCode: '+92',
                displayOrder: 26
            },
            {
                name: 'Bangladesh',
                code: 'BGD',
                emoji: '🇧🇩',
                flagUrl: 'https://flagcdn.com/w320/bd.png',
                phoneCode: '+880',
                displayOrder: 27
            },
            {
                name: 'Egypt',
                code: 'EGY',
                emoji: '🇪🇬',
                flagUrl: 'https://flagcdn.com/w320/eg.png',
                phoneCode: '+20',
                displayOrder: 28
            },
            {
                name: 'South Africa',
                code: 'ZAF',
                emoji: '🇿🇦',
                flagUrl: 'https://flagcdn.com/w320/za.png',
                phoneCode: '+27',
                displayOrder: 29
            },
            {
                name: 'Nigeria',
                code: 'NGA',
                emoji: '🇳🇬',
                flagUrl: 'https://flagcdn.com/w320/ng.png',
                phoneCode: '+234',
                displayOrder: 30
            },
            {
                name: 'Poland',
                code: 'POL',
                emoji: '🇵🇱',
                flagUrl: 'https://flagcdn.com/w320/pl.png',
                phoneCode: '+48',
                displayOrder: 31
            },
            {
                name: 'Sweden',
                code: 'SWE',
                emoji: '🇸🇪',
                flagUrl: 'https://flagcdn.com/w320/se.png',
                phoneCode: '+46',
                displayOrder: 32
            },
            {
                name: 'Norway',
                code: 'NOR',
                emoji: '🇳🇴',
                flagUrl: 'https://flagcdn.com/w320/no.png',
                phoneCode: '+47',
                displayOrder: 33
            },
            {
                name: 'Denmark',
                code: 'DNK',
                emoji: '🇩🇰',
                flagUrl: 'https://flagcdn.com/w320/dk.png',
                phoneCode: '+45',
                displayOrder: 34
            },
            {
                name: 'Finland',
                code: 'FIN',
                emoji: '🇫🇮',
                flagUrl: 'https://flagcdn.com/w320/fi.png',
                phoneCode: '+358',
                displayOrder: 35
            },
            {
                name: 'Switzerland',
                code: 'CHE',
                emoji: '🇨🇭',
                flagUrl: 'https://flagcdn.com/w320/ch.png',
                phoneCode: '+41',
                displayOrder: 36
            },
            {
                name: 'Austria',
                code: 'AUT',
                emoji: '🇦🇹',
                flagUrl: 'https://flagcdn.com/w320/at.png',
                phoneCode: '+43',
                displayOrder: 37
            },
            {
                name: 'Belgium',
                code: 'BEL',
                emoji: '🇧🇪',
                flagUrl: 'https://flagcdn.com/w320/be.png',
                phoneCode: '+32',
                displayOrder: 38
            },
            {
                name: 'Greece',
                code: 'GRC',
                emoji: '🇬🇷',
                flagUrl: 'https://flagcdn.com/w320/gr.png',
                phoneCode: '+30',
                displayOrder: 39
            },
            {
                name: 'Portugal',
                code: 'PRT',
                emoji: '🇵🇹',
                flagUrl: 'https://flagcdn.com/w320/pt.png',
                phoneCode: '+351',
                displayOrder: 40
            },
            {
                name: 'Argentina',
                code: 'ARG',
                emoji: '🇦🇷',
                flagUrl: 'https://flagcdn.com/w320/ar.png',
                phoneCode: '+54',
                displayOrder: 41
            },
            {
                name: 'Chile',
                code: 'CHL',
                emoji: '🇨🇱',
                flagUrl: 'https://flagcdn.com/w320/cl.png',
                phoneCode: '+56',
                displayOrder: 42
            },
            {
                name: 'Colombia',
                code: 'COL',
                emoji: '🇨🇴',
                flagUrl: 'https://flagcdn.com/w320/co.png',
                phoneCode: '+57',
                displayOrder: 43
            },
            {
                name: 'Peru',
                code: 'PER',
                emoji: '🇵🇪',
                flagUrl: 'https://flagcdn.com/w320/pe.png',
                phoneCode: '+51',
                displayOrder: 44
            },
            {
                name: 'Venezuela',
                code: 'VEN',
                emoji: '🇻🇪',
                flagUrl: 'https://flagcdn.com/w320/ve.png',
                phoneCode: '+58',
                displayOrder: 45
            },
            {
                name: 'Israel',
                code: 'ISR',
                emoji: '🇮🇱',
                flagUrl: 'https://flagcdn.com/w320/il.png',
                phoneCode: '+972',
                displayOrder: 46
            },
            {
                name: 'New Zealand',
                code: 'NZL',
                emoji: '🇳🇿',
                flagUrl: 'https://flagcdn.com/w320/nz.png',
                phoneCode: '+64',
                displayOrder: 47
            },
            {
                name: 'Ireland',
                code: 'IRL',
                emoji: '🇮🇪',
                flagUrl: 'https://flagcdn.com/w320/ie.png',
                phoneCode: '+353',
                displayOrder: 48
            },
            {
                name: 'Czech Republic',
                code: 'CZE',
                emoji: '🇨🇿',
                flagUrl: 'https://flagcdn.com/w320/cz.png',
                phoneCode: '+420',
                displayOrder: 49
            },
            {
                name: 'Romania',
                code: 'ROU',
                emoji: '🇷🇴',
                flagUrl: 'https://flagcdn.com/w320/ro.png',
                phoneCode: '+40',
                displayOrder: 50
            },
            // Additional major countries
            {
                name: 'Ukraine',
                code: 'UKR',
                emoji: '🇺🇦',
                flagUrl: 'https://flagcdn.com/w320/ua.png',
                phoneCode: '+380',
                displayOrder: 51
            },
            {
                name: 'Morocco',
                code: 'MAR',
                emoji: '🇲🇦',
                flagUrl: 'https://flagcdn.com/w320/ma.png',
                phoneCode: '+212',
                displayOrder: 52
            },
            {
                name: 'Kenya',
                code: 'KEN',
                emoji: '🇰🇪',
                flagUrl: 'https://flagcdn.com/w320/ke.png',
                phoneCode: '+254',
                displayOrder: 53
            },
            {
                name: 'Ghana',
                code: 'GHA',
                emoji: '🇬🇭',
                flagUrl: 'https://flagcdn.com/w320/gh.png',
                phoneCode: '+233',
                displayOrder: 54
            },
            {
                name: 'Ethiopia',
                code: 'ETH',
                emoji: '🇪🇹',
                flagUrl: 'https://flagcdn.com/w320/et.png',
                phoneCode: '+251',
                displayOrder: 55
            },
            {
                name: 'Tanzania',
                code: 'TZA',
                emoji: '🇹🇿',
                flagUrl: 'https://flagcdn.com/w320/tz.png',
                phoneCode: '+255',
                displayOrder: 56
            },
            {
                name: 'Uganda',
                code: 'UGA',
                emoji: '🇺🇬',
                flagUrl: 'https://flagcdn.com/w320/ug.png',
                phoneCode: '+256',
                displayOrder: 57
            },
            {
                name: 'Algeria',
                code: 'DZA',
                emoji: '🇩🇿',
                flagUrl: 'https://flagcdn.com/w320/dz.png',
                phoneCode: '+213',
                displayOrder: 58
            },
            {
                name: 'Tunisia',
                code: 'TUN',
                emoji: '🇹🇳',
                flagUrl: 'https://flagcdn.com/w320/tn.png',
                phoneCode: '+216',
                displayOrder: 59
            },
            {
                name: 'Jordan',
                code: 'JOR',
                emoji: '🇯🇴',
                flagUrl: 'https://flagcdn.com/w320/jo.png',
                phoneCode: '+962',
                displayOrder: 60
            },
            {
                name: 'Lebanon',
                code: 'LBN',
                emoji: '🇱🇧',
                flagUrl: 'https://flagcdn.com/w320/lb.png',
                phoneCode: '+961',
                displayOrder: 61
            },
            {
                name: 'Iraq',
                code: 'IRQ',
                emoji: '🇮🇶',
                flagUrl: 'https://flagcdn.com/w320/iq.png',
                phoneCode: '+964',
                displayOrder: 62
            },
            {
                name: 'Iran',
                code: 'IRN',
                emoji: '🇮🇷',
                flagUrl: 'https://flagcdn.com/w320/ir.png',
                phoneCode: '+98',
                displayOrder: 63
            },
            {
                name: 'Kuwait',
                code: 'KWT',
                emoji: '🇰🇼',
                flagUrl: 'https://flagcdn.com/w320/kw.png',
                phoneCode: '+965',
                displayOrder: 64
            },
            {
                name: 'Oman',
                code: 'OMN',
                emoji: '🇴🇲',
                flagUrl: 'https://flagcdn.com/w320/om.png',
                phoneCode: '+968',
                displayOrder: 65
            },
            {
                name: 'Qatar',
                code: 'QAT',
                emoji: '🇶🇦',
                flagUrl: 'https://flagcdn.com/w320/qa.png',
                phoneCode: '+974',
                displayOrder: 66
            },
            {
                name: 'Bahrain',
                code: 'BHR',
                emoji: '🇧🇭',
                flagUrl: 'https://flagcdn.com/w320/bh.png',
                phoneCode: '+973',
                displayOrder: 67
            },
            {
                name: 'Sri Lanka',
                code: 'LKA',
                emoji: '🇱🇰',
                flagUrl: 'https://flagcdn.com/w320/lk.png',
                phoneCode: '+94',
                displayOrder: 68
            },
            {
                name: 'Nepal',
                code: 'NPL',
                emoji: '🇳🇵',
                flagUrl: 'https://flagcdn.com/w320/np.png',
                phoneCode: '+977',
                displayOrder: 69
            },
            {
                name: 'Afghanistan',
                code: 'AFG',
                emoji: '🇦🇫',
                flagUrl: 'https://flagcdn.com/w320/af.png',
                phoneCode: '+93',
                displayOrder: 70
            },
            {
                name: 'Myanmar',
                code: 'MMR',
                emoji: '🇲🇲',
                flagUrl: 'https://flagcdn.com/w320/mm.png',
                phoneCode: '+95',
                displayOrder: 71
            },
            {
                name: 'Cambodia',
                code: 'KHM',
                emoji: '🇰🇭',
                flagUrl: 'https://flagcdn.com/w320/kh.png',
                phoneCode: '+855',
                displayOrder: 72
            },
            {
                name: 'Laos',
                code: 'LAO',
                emoji: '🇱🇦',
                flagUrl: 'https://flagcdn.com/w320/la.png',
                phoneCode: '+856',
                displayOrder: 73
            },
            {
                name: 'Mongolia',
                code: 'MNG',
                emoji: '🇲🇳',
                flagUrl: 'https://flagcdn.com/w320/mn.png',
                phoneCode: '+976',
                displayOrder: 74
            },
            {
                name: 'Kazakhstan',
                code: 'KAZ',
                emoji: '🇰🇿',
                flagUrl: 'https://flagcdn.com/w320/kz.png',
                phoneCode: '+7',
                displayOrder: 75
            },
            {
                name: 'Uzbekistan',
                code: 'UZB',
                emoji: '🇺🇿',
                flagUrl: 'https://flagcdn.com/w320/uz.png',
                phoneCode: '+998',
                displayOrder: 76
            },
            {
                name: 'Azerbaijan',
                code: 'AZE',
                emoji: '🇦🇿',
                flagUrl: 'https://flagcdn.com/w320/az.png',
                phoneCode: '+994',
                displayOrder: 77
            },
            {
                name: 'Georgia',
                code: 'GEO',
                emoji: '🇬🇪',
                flagUrl: 'https://flagcdn.com/w320/ge.png',
                phoneCode: '+995',
                displayOrder: 78
            },
            {
                name: 'Armenia',
                code: 'ARM',
                emoji: '🇦🇲',
                flagUrl: 'https://flagcdn.com/w320/am.png',
                phoneCode: '+374',
                displayOrder: 79
            },
            {
                name: 'Belarus',
                code: 'BLR',
                emoji: '🇧🇾',
                flagUrl: 'https://flagcdn.com/w320/by.png',
                phoneCode: '+375',
                displayOrder: 80
            },
            {
                name: 'Moldova',
                code: 'MDA',
                emoji: '🇲🇩',
                flagUrl: 'https://flagcdn.com/w320/md.png',
                phoneCode: '+373',
                displayOrder: 81
            },
            {
                name: 'Bosnia and Herzegovina',
                code: 'BIH',
                emoji: '🇧🇦',
                flagUrl: 'https://flagcdn.com/w320/ba.png',
                phoneCode: '+387',
                displayOrder: 82
            },
            {
                name: 'Serbia',
                code: 'SRB',
                emoji: '🇷🇸',
                flagUrl: 'https://flagcdn.com/w320/rs.png',
                phoneCode: '+381',
                displayOrder: 83
            },
            {
                name: 'Croatia',
                code: 'HRV',
                emoji: '🇭🇷',
                flagUrl: 'https://flagcdn.com/w320/hr.png',
                phoneCode: '+385',
                displayOrder: 84
            },
            {
                name: 'Slovenia',
                code: 'SVN',
                emoji: '🇸🇮',
                flagUrl: 'https://flagcdn.com/w320/si.png',
                phoneCode: '+386',
                displayOrder: 85
            },
            {
                name: 'Slovakia',
                code: 'SVK',
                emoji: '🇸🇰',
                flagUrl: 'https://flagcdn.com/w320/sk.png',
                phoneCode: '+421',
                displayOrder: 86
            },
            {
                name: 'Hungary',
                code: 'HUN',
                emoji: '🇭🇺',
                flagUrl: 'https://flagcdn.com/w320/hu.png',
                phoneCode: '+36',
                displayOrder: 87
            },
            {
                name: 'Bulgaria',
                code: 'BGR',
                emoji: '🇧🇬',
                flagUrl: 'https://flagcdn.com/w320/bg.png',
                phoneCode: '+359',
                displayOrder: 88
            },
            {
                name: 'Albania',
                code: 'ALB',
                emoji: '🇦🇱',
                flagUrl: 'https://flagcdn.com/w320/al.png',
                phoneCode: '+355',
                displayOrder: 89
            },
            {
                name: 'North Macedonia',
                code: 'MKD',
                emoji: '🇲🇰',
                flagUrl: 'https://flagcdn.com/w320/mk.png',
                phoneCode: '+389',
                displayOrder: 90
            },
            {
                name: 'Montenegro',
                code: 'MNE',
                emoji: '🇲🇪',
                flagUrl: 'https://flagcdn.com/w320/me.png',
                phoneCode: '+382',
                displayOrder: 91
            },
            {
                name: 'Kosovo',
                code: 'XKX',
                emoji: '🇽🇰',
                flagUrl: 'https://flagcdn.com/w320/xk.png',
                phoneCode: '+383',
                displayOrder: 92
            },
            {
                name: 'Estonia',
                code: 'EST',
                emoji: '🇪🇪',
                flagUrl: 'https://flagcdn.com/w320/ee.png',
                phoneCode: '+372',
                displayOrder: 93
            },
            {
                name: 'Latvia',
                code: 'LVA',
                emoji: '🇱🇻',
                flagUrl: 'https://flagcdn.com/w320/lv.png',
                phoneCode: '+371',
                displayOrder: 94
            },
            {
                name: 'Lithuania',
                code: 'LTU',
                emoji: '🇱🇹',
                flagUrl: 'https://flagcdn.com/w320/lt.png',
                phoneCode: '+370',
                displayOrder: 95
            },
            {
                name: 'Luxembourg',
                code: 'LUX',
                emoji: '🇱🇺',
                flagUrl: 'https://flagcdn.com/w320/lu.png',
                phoneCode: '+352',
                displayOrder: 96
            },
            {
                name: 'Malta',
                code: 'MLT',
                emoji: '🇲🇹',
                flagUrl: 'https://flagcdn.com/w320/mt.png',
                phoneCode: '+356',
                displayOrder: 97
            },
            {
                name: 'Cyprus',
                code: 'CYP',
                emoji: '🇨🇾',
                flagUrl: 'https://flagcdn.com/w320/cy.png',
                phoneCode: '+357',
                displayOrder: 98
            },
            {
                name: 'Iceland',
                code: 'ISL',
                emoji: '🇮🇸',
                flagUrl: 'https://flagcdn.com/w320/is.png',
                phoneCode: '+354',
                displayOrder: 99
            },
            {
                name: 'Hong Kong',
                code: 'HKG',
                emoji: '🇭🇰',
                flagUrl: 'https://flagcdn.com/w320/hk.png',
                phoneCode: '+852',
                displayOrder: 100
            },
            {
                name: 'Taiwan',
                code: 'TWN',
                emoji: '🇹🇼',
                flagUrl: 'https://flagcdn.com/w320/tw.png',
                phoneCode: '+886',
                displayOrder: 101
            },
            {
                name: 'Macau',
                code: 'MAC',
                emoji: '🇲🇴',
                flagUrl: 'https://flagcdn.com/w320/mo.png',
                phoneCode: '+853',
                displayOrder: 102
            },
            {
                name: 'Brunei',
                code: 'BRN',
                emoji: '🇧🇳',
                flagUrl: 'https://flagcdn.com/w320/bn.png',
                phoneCode: '+673',
                displayOrder: 103
            },
            {
                name: 'Maldives',
                code: 'MDV',
                emoji: '🇲🇻',
                flagUrl: 'https://flagcdn.com/w320/mv.png',
                phoneCode: '+960',
                displayOrder: 104
            },
            {
                name: 'Bhutan',
                code: 'BTN',
                emoji: '🇧🇹',
                flagUrl: 'https://flagcdn.com/w320/bt.png',
                phoneCode: '+975',
                displayOrder: 105
            },
            {
                name: 'Fiji',
                code: 'FJI',
                emoji: '🇫🇯',
                flagUrl: 'https://flagcdn.com/w320/fj.png',
                phoneCode: '+679',
                displayOrder: 106
            },
            {
                name: 'Papua New Guinea',
                code: 'PNG',
                emoji: '🇵🇬',
                flagUrl: 'https://flagcdn.com/w320/pg.png',
                phoneCode: '+675',
                displayOrder: 107
            },
            {
                name: 'Uruguay',
                code: 'URY',
                emoji: '🇺🇾',
                flagUrl: 'https://flagcdn.com/w320/uy.png',
                phoneCode: '+598',
                displayOrder: 108
            },
            {
                name: 'Paraguay',
                code: 'PRY',
                emoji: '🇵🇾',
                flagUrl: 'https://flagcdn.com/w320/py.png',
                phoneCode: '+595',
                displayOrder: 109
            },
            {
                name: 'Bolivia',
                code: 'BOL',
                emoji: '🇧🇴',
                flagUrl: 'https://flagcdn.com/w320/bo.png',
                phoneCode: '+591',
                displayOrder: 110
            },
            {
                name: 'Ecuador',
                code: 'ECU',
                emoji: '🇪🇨',
                flagUrl: 'https://flagcdn.com/w320/ec.png',
                phoneCode: '+593',
                displayOrder: 111
            },
            {
                name: 'Guyana',
                code: 'GUY',
                emoji: '🇬🇾',
                flagUrl: 'https://flagcdn.com/w320/gy.png',
                phoneCode: '+592',
                displayOrder: 112
            },
            {
                name: 'Suriname',
                code: 'SUR',
                emoji: '🇸🇷',
                flagUrl: 'https://flagcdn.com/w320/sr.png',
                phoneCode: '+597',
                displayOrder: 113
            },
            {
                name: 'Panama',
                code: 'PAN',
                emoji: '🇵🇦',
                flagUrl: 'https://flagcdn.com/w320/pa.png',
                phoneCode: '+507',
                displayOrder: 114
            },
            {
                name: 'Costa Rica',
                code: 'CRI',
                emoji: '🇨🇷',
                flagUrl: 'https://flagcdn.com/w320/cr.png',
                phoneCode: '+506',
                displayOrder: 115
            },
            {
                name: 'Nicaragua',
                code: 'NIC',
                emoji: '🇳🇮',
                flagUrl: 'https://flagcdn.com/w320/ni.png',
                phoneCode: '+505',
                displayOrder: 116
            },
            {
                name: 'Honduras',
                code: 'HND',
                emoji: '🇭🇳',
                flagUrl: 'https://flagcdn.com/w320/hn.png',
                phoneCode: '+504',
                displayOrder: 117
            },
            {
                name: 'El Salvador',
                code: 'SLV',
                emoji: '🇸🇻',
                flagUrl: 'https://flagcdn.com/w320/sv.png',
                phoneCode: '+503',
                displayOrder: 118
            },
            {
                name: 'Guatemala',
                code: 'GTM',
                emoji: '🇬🇹',
                flagUrl: 'https://flagcdn.com/w320/gt.png',
                phoneCode: '+502',
                displayOrder: 119
            },
            {
                name: 'Belize',
                code: 'BLZ',
                emoji: '🇧🇿',
                flagUrl: 'https://flagcdn.com/w320/bz.png',
                phoneCode: '+501',
                displayOrder: 120
            },
            {
                name: 'Jamaica',
                code: 'JAM',
                emoji: '🇯🇲',
                flagUrl: 'https://flagcdn.com/w320/jm.png',
                phoneCode: '+1876',
                displayOrder: 121
            },
            {
                name: 'Trinidad and Tobago',
                code: 'TTO',
                emoji: '🇹🇹',
                flagUrl: 'https://flagcdn.com/w320/tt.png',
                phoneCode: '+1868',
                displayOrder: 122
            },
            {
                name: 'Barbados',
                code: 'BRB',
                emoji: '🇧🇧',
                flagUrl: 'https://flagcdn.com/w320/bb.png',
                phoneCode: '+1246',
                displayOrder: 123
            },
            {
                name: 'Dominican Republic',
                code: 'DOM',
                emoji: '🇩🇴',
                flagUrl: 'https://flagcdn.com/w320/do.png',
                phoneCode: '+1809',
                displayOrder: 124
            },
            {
                name: 'Haiti',
                code: 'HTI',
                emoji: '🇭🇹',
                flagUrl: 'https://flagcdn.com/w320/ht.png',
                phoneCode: '+509',
                displayOrder: 125
            },
            {
                name: 'Cuba',
                code: 'CUB',
                emoji: '🇨🇺',
                flagUrl: 'https://flagcdn.com/w320/cu.png',
                phoneCode: '+53',
                displayOrder: 126
            },
            {
                name: 'Bahamas',
                code: 'BHS',
                emoji: '🇧🇸',
                flagUrl: 'https://flagcdn.com/w320/bs.png',
                phoneCode: '+1242',
                displayOrder: 127
            },
            {
                name: 'Cameroon',
                code: 'CMR',
                emoji: '🇨🇲',
                flagUrl: 'https://flagcdn.com/w320/cm.png',
                phoneCode: '+237',
                displayOrder: 128
            },
            {
                name: 'Senegal',
                code: 'SEN',
                emoji: '🇸🇳',
                flagUrl: 'https://flagcdn.com/w320/sn.png',
                phoneCode: '+221',
                displayOrder: 129
            },
            {
                name: 'Ivory Coast',
                code: 'CIV',
                emoji: '🇨🇮',
                flagUrl: 'https://flagcdn.com/w320/ci.png',
                phoneCode: '+225',
                displayOrder: 130
            },
            {
                name: 'Zimbabwe',
                code: 'ZWE',
                emoji: '🇿🇼',
                flagUrl: 'https://flagcdn.com/w320/zw.png',
                phoneCode: '+263',
                displayOrder: 131
            },
            {
                name: 'Zambia',
                code: 'ZMB',
                emoji: '🇿🇲',
                flagUrl: 'https://flagcdn.com/w320/zm.png',
                phoneCode: '+260',
                displayOrder: 132
            },
            {
                name: 'Mozambique',
                code: 'MOZ',
                emoji: '🇲🇿',
                flagUrl: 'https://flagcdn.com/w320/mz.png',
                phoneCode: '+258',
                displayOrder: 133
            },
            {
                name: 'Botswana',
                code: 'BWA',
                emoji: '🇧🇼',
                flagUrl: 'https://flagcdn.com/w320/bw.png',
                phoneCode: '+267',
                displayOrder: 134
            },
            {
                name: 'Namibia',
                code: 'NAM',
                emoji: '🇳🇦',
                flagUrl: 'https://flagcdn.com/w320/na.png',
                phoneCode: '+264',
                displayOrder: 135
            },
            {
                name: 'Angola',
                code: 'AGO',
                emoji: '🇦🇴',
                flagUrl: 'https://flagcdn.com/w320/ao.png',
                phoneCode: '+244',
                displayOrder: 136
            },
            {
                name: 'Rwanda',
                code: 'RWA',
                emoji: '🇷🇼',
                flagUrl: 'https://flagcdn.com/w320/rw.png',
                phoneCode: '+250',
                displayOrder: 137
            },
            {
                name: 'Madagascar',
                code: 'MDG',
                emoji: '🇲🇬',
                flagUrl: 'https://flagcdn.com/w320/mg.png',
                phoneCode: '+261',
                displayOrder: 138
            },
            {
                name: 'Mauritius',
                code: 'MUS',
                emoji: '🇲🇺',
                flagUrl: 'https://flagcdn.com/w320/mu.png',
                phoneCode: '+230',
                displayOrder: 139
            },
            {
                name: 'Seychelles',
                code: 'SYC',
                emoji: '🇸🇨',
                flagUrl: 'https://flagcdn.com/w320/sc.png',
                phoneCode: '+248',
                displayOrder: 140
            },
            {
                name: 'Libya',
                code: 'LBY',
                emoji: '🇱🇾',
                flagUrl: 'https://flagcdn.com/w320/ly.png',
                phoneCode: '+218',
                displayOrder: 141
            },
            {
                name: 'Sudan',
                code: 'SDN',
                emoji: '🇸🇩',
                flagUrl: 'https://flagcdn.com/w320/sd.png',
                phoneCode: '+249',
                displayOrder: 142
            },
            {
                name: 'Mali',
                code: 'MLI',
                emoji: '🇲🇱',
                flagUrl: 'https://flagcdn.com/w320/ml.png',
                phoneCode: '+223',
                displayOrder: 143
            },
            {
                name: 'Niger',
                code: 'NER',
                emoji: '🇳🇪',
                flagUrl: 'https://flagcdn.com/w320/ne.png',
                phoneCode: '+227',
                displayOrder: 144
            },
            {
                name: 'Chad',
                code: 'TCD',
                emoji: '🇹🇩',
                flagUrl: 'https://flagcdn.com/w320/td.png',
                phoneCode: '+235',
                displayOrder: 145
            },
            {
                name: 'Burkina Faso',
                code: 'BFA',
                emoji: '🇧🇫',
                flagUrl: 'https://flagcdn.com/w320/bf.png',
                phoneCode: '+226',
                displayOrder: 146
            },
            {
                name: 'Benin',
                code: 'BEN',
                emoji: '🇧🇯',
                flagUrl: 'https://flagcdn.com/w320/bj.png',
                phoneCode: '+229',
                displayOrder: 147
            },
            {
                name: 'Togo',
                code: 'TGO',
                emoji: '🇹🇬',
                flagUrl: 'https://flagcdn.com/w320/tg.png',
                phoneCode: '+228',
                displayOrder: 148
            },
            {
                name: 'Guinea',
                code: 'GIN',
                emoji: '🇬🇳',
                flagUrl: 'https://flagcdn.com/w320/gn.png',
                phoneCode: '+224',
                displayOrder: 149
            },
            {
                name: 'Sierra Leone',
                code: 'SLE',
                emoji: '🇸🇱',
                flagUrl: 'https://flagcdn.com/w320/sl.png',
                phoneCode: '+232',
                displayOrder: 150
            },
            {
                name: 'Liberia',
                code: 'LBR',
                emoji: '🇱🇷',
                flagUrl: 'https://flagcdn.com/w320/lr.png',
                phoneCode: '+231',
                displayOrder: 151
            },
            {
                name: 'Mauritania',
                code: 'MRT',
                emoji: '🇲🇷',
                flagUrl: 'https://flagcdn.com/w320/mr.png',
                phoneCode: '+222',
                displayOrder: 152
            },
            {
                name: 'Gambia',
                code: 'GMB',
                emoji: '🇬🇲',
                flagUrl: 'https://flagcdn.com/w320/gm.png',
                phoneCode: '+220',
                displayOrder: 153
            },
            {
                name: 'Somalia',
                code: 'SOM',
                emoji: '🇸🇴',
                flagUrl: 'https://flagcdn.com/w320/so.png',
                phoneCode: '+252',
                displayOrder: 154
            },
            {
                name: 'Djibouti',
                code: 'DJI',
                emoji: '🇩🇯',
                flagUrl: 'https://flagcdn.com/w320/dj.png',
                phoneCode: '+253',
                displayOrder: 155
            },
            {
                name: 'Eritrea',
                code: 'ERI',
                emoji: '🇪🇷',
                flagUrl: 'https://flagcdn.com/w320/er.png',
                phoneCode: '+291',
                displayOrder: 156
            },
            {
                name: 'Cape Verde',
                code: 'CPV',
                emoji: '🇨🇻',
                flagUrl: 'https://flagcdn.com/w320/cv.png',
                phoneCode: '+238',
                displayOrder: 157
            },
            {
                name: 'Comoros',
                code: 'COM',
                emoji: '🇰🇲',
                flagUrl: 'https://flagcdn.com/w320/km.png',
                phoneCode: '+269',
                displayOrder: 158
            },
            {
                name: 'Malawi',
                code: 'MWI',
                emoji: '🇲🇼',
                flagUrl: 'https://flagcdn.com/w320/mw.png',
                phoneCode: '+265',
                displayOrder: 159
            },
            {
                name: 'Lesotho',
                code: 'LSO',
                emoji: '🇱🇸',
                flagUrl: 'https://flagcdn.com/w320/ls.png',
                phoneCode: '+266',
                displayOrder: 160
            },
            {
                name: 'Eswatini',
                code: 'SWZ',
                emoji: '🇸🇿',
                flagUrl: 'https://flagcdn.com/w320/sz.png',
                phoneCode: '+268',
                displayOrder: 161
            },
            {
                name: 'Equatorial Guinea',
                code: 'GNQ',
                emoji: '🇬🇶',
                flagUrl: 'https://flagcdn.com/w320/gq.png',
                phoneCode: '+240',
                displayOrder: 162
            },
            {
                name: 'Gabon',
                code: 'GAB',
                emoji: '🇬🇦',
                flagUrl: 'https://flagcdn.com/w320/ga.png',
                phoneCode: '+241',
                displayOrder: 163
            },
            {
                name: 'Republic of the Congo',
                code: 'COG',
                emoji: '🇨🇬',
                flagUrl: 'https://flagcdn.com/w320/cg.png',
                phoneCode: '+242',
                displayOrder: 164
            },
            {
                name: 'Democratic Republic of the Congo',
                code: 'COD',
                emoji: '🇨🇩',
                flagUrl: 'https://flagcdn.com/w320/cd.png',
                phoneCode: '+243',
                displayOrder: 165
            },
            {
                name: 'Central African Republic',
                code: 'CAF',
                emoji: '🇨🇫',
                flagUrl: 'https://flagcdn.com/w320/cf.png',
                phoneCode: '+236',
                displayOrder: 166
            },
            {
                name: 'Burundi',
                code: 'BDI',
                emoji: '🇧🇮',
                flagUrl: 'https://flagcdn.com/w320/bi.png',
                phoneCode: '+257',
                displayOrder: 167
            },
            {
                name: 'South Sudan',
                code: 'SSD',
                emoji: '🇸🇸',
                flagUrl: 'https://flagcdn.com/w320/ss.png',
                phoneCode: '+211',
                displayOrder: 168
            },
            {
                name: 'Turkmenistan',
                code: 'TKM',
                emoji: '🇹🇲',
                flagUrl: 'https://flagcdn.com/w320/tm.png',
                phoneCode: '+993',
                displayOrder: 169
            },
            {
                name: 'Tajikistan',
                code: 'TJK',
                emoji: '🇹🇯',
                flagUrl: 'https://flagcdn.com/w320/tj.png',
                phoneCode: '+992',
                displayOrder: 170
            },
            {
                name: 'Kyrgyzstan',
                code: 'KGZ',
                emoji: '🇰🇬',
                flagUrl: 'https://flagcdn.com/w320/kg.png',
                phoneCode: '+996',
                displayOrder: 171
            },
            {
                name: 'Yemen',
                code: 'YEM',
                emoji: '🇾🇪',
                flagUrl: 'https://flagcdn.com/w320/ye.png',
                phoneCode: '+967',
                displayOrder: 172
            },
            {
                name: 'Syria',
                code: 'SYR',
                emoji: '🇸🇾',
                flagUrl: 'https://flagcdn.com/w320/sy.png',
                phoneCode: '+963',
                displayOrder: 173
            },
            {
                name: 'Palestine',
                code: 'PSE',
                emoji: '🇵🇸',
                flagUrl: 'https://flagcdn.com/w320/ps.png',
                phoneCode: '+970',
                displayOrder: 174
            },
            {
                name: 'Timor-Leste',
                code: 'TLS',
                emoji: '🇹🇱',
                flagUrl: 'https://flagcdn.com/w320/tl.png',
                phoneCode: '+670',
                displayOrder: 175
            },
            {
                name: 'Solomon Islands',
                code: 'SLB',
                emoji: '🇸🇧',
                flagUrl: 'https://flagcdn.com/w320/sb.png',
                phoneCode: '+677',
                displayOrder: 176
            },
            {
                name: 'Vanuatu',
                code: 'VUT',
                emoji: '🇻🇺',
                flagUrl: 'https://flagcdn.com/w320/vu.png',
                phoneCode: '+678',
                displayOrder: 177
            },
            {
                name: 'Samoa',
                code: 'WSM',
                emoji: '🇼🇸',
                flagUrl: 'https://flagcdn.com/w320/ws.png',
                phoneCode: '+685',
                displayOrder: 178
            },
            {
                name: 'Tonga',
                code: 'TON',
                emoji: '🇹🇴',
                flagUrl: 'https://flagcdn.com/w320/to.png',
                phoneCode: '+676',
                displayOrder: 179
            },
            {
                name: 'Kiribati',
                code: 'KIR',
                emoji: '🇰🇮',
                flagUrl: 'https://flagcdn.com/w320/ki.png',
                phoneCode: '+686',
                displayOrder: 180
            },
            {
                name: 'Micronesia',
                code: 'FSM',
                emoji: '🇫🇲',
                flagUrl: 'https://flagcdn.com/w320/fm.png',
                phoneCode: '+691',
                displayOrder: 181
            },
            {
                name: 'Marshall Islands',
                code: 'MHL',
                emoji: '🇲🇭',
                flagUrl: 'https://flagcdn.com/w320/mh.png',
                phoneCode: '+692',
                displayOrder: 182
            },
            {
                name: 'Palau',
                code: 'PLW',
                emoji: '🇵🇼',
                flagUrl: 'https://flagcdn.com/w320/pw.png',
                phoneCode: '+680',
                displayOrder: 183
            },
            {
                name: 'Nauru',
                code: 'NRU',
                emoji: '🇳🇷',
                flagUrl: 'https://flagcdn.com/w320/nr.png',
                phoneCode: '+674',
                displayOrder: 184
            },
            {
                name: 'Tuvalu',
                code: 'TUV',
                emoji: '🇹🇻',
                flagUrl: 'https://flagcdn.com/w320/tv.png',
                phoneCode: '+688',
                displayOrder: 185
            },
            {
                name: 'Andorra',
                code: 'AND',
                emoji: '🇦🇩',
                flagUrl: 'https://flagcdn.com/w320/ad.png',
                phoneCode: '+376',
                displayOrder: 186
            },
            {
                name: 'Monaco',
                code: 'MCO',
                emoji: '🇲🇨',
                flagUrl: 'https://flagcdn.com/w320/mc.png',
                phoneCode: '+377',
                displayOrder: 187
            },
            {
                name: 'San Marino',
                code: 'SMR',
                emoji: '🇸🇲',
                flagUrl: 'https://flagcdn.com/w320/sm.png',
                phoneCode: '+378',
                displayOrder: 188
            },
            {
                name: 'Vatican City',
                code: 'VAT',
                emoji: '🇻🇦',
                flagUrl: 'https://flagcdn.com/w320/va.png',
                phoneCode: '+379',
                displayOrder: 189
            },
            {
                name: 'Liechtenstein',
                code: 'LIE',
                emoji: '🇱🇮',
                flagUrl: 'https://flagcdn.com/w320/li.png',
                phoneCode: '+423',
                displayOrder: 190
            }
        ]

        for (const countryData of countries) {
            const existing = await this.findByCode(countryData.code)
            if (!existing) {
                await this.create(countryData)
            }
        }
    }
}
