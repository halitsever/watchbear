import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

// WORD-XXXXXX, see generateCode in the extension. kept loose on the word/suffix
// length so the format can evolve without breaking older clients.
const CODE = /^[A-Z]{2,8}-[A-Z0-9]{4,12}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

export class MemberDto {
  @IsString()
  @MaxLength(24)
  name!: string;

  @IsString()
  @Matches(HEX)
  fur!: string;

  @IsString()
  @Matches(HEX)
  furDark!: string;
}

export class JoinDto {
  @IsString()
  @Matches(CODE)
  code!: string;

  @ValidateNested()
  @Type(() => MemberDto)
  member!: MemberDto;
}

export class SubscribeDto {
  @IsString()
  @Matches(CODE)
  code!: string;

  @IsBoolean()
  @IsOptional()
  anchor?: boolean;

  @IsString()
  @MaxLength(512)
  @IsOptional()
  key?: string;

  @IsString()
  @MaxLength(2048)
  @IsOptional()
  url?: string;

  @IsString()
  @MaxLength(300)
  @IsOptional()
  title?: string;
}

export class VideoContentDto {
  @IsString()
  @MaxLength(512)
  key!: string;

  @IsString()
  @MaxLength(2048)
  url!: string;

  @IsString()
  @MaxLength(300)
  title!: string;
}

export class ChatDto {
  @IsString()
  @MaxLength(500)
  text!: string;
}

export class VideoControlDto {
  @IsString()
  @Matches(CODE)
  code!: string;

  @IsNumber()
  @Min(0)
  @Max(86_400)
  time!: number;

  @IsBoolean()
  paused!: boolean;
}
