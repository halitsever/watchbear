import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

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
