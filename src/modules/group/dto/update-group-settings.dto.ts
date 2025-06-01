import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateGroupSettingsDto {
    @IsBoolean()
    @IsOptional()
    allowTextMessages?: boolean

    @IsBoolean()
    @IsOptional()
    allowVoiceMessages?: boolean

    @IsBoolean()
    @IsOptional()
    allowImageMessages?: boolean

    @IsBoolean()
    @IsOptional()
    allowVideoMessages?: boolean

    @IsBoolean()
    @IsOptional()
    allowFileSharing?: boolean

    @IsBoolean()
    @IsOptional()
    allowGifts?: boolean

    @IsBoolean()
    @IsOptional()
    requireApproval?: boolean
}
