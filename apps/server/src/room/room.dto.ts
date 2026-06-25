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

// in-room identity change; the code is read from the server-tracked socket binding,
// never the payload, so a client can only update its own member in its own room.
export class MemberUpdateDto {
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

  @IsString()
  @MaxLength(24)
  @IsOptional()
  name?: string;
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

// the quoted message a reply points at. carried as a snapshot (not just an id)
// because chat history isn't stored server-side, so a late joiner can still see it.
export class ReplyToDto {
  @IsString()
  @MaxLength(64)
  @IsOptional()
  mid?: string;

  @IsString()
  @MaxLength(24)
  from!: string;

  @IsString()
  @MaxLength(200)
  text!: string;
}

export class ChatDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  // shared cross-client id the sender mints, so a reply can reference the same
  // message on every client (also used to scroll/highlight the original).
  @IsString()
  @MaxLength(64)
  @IsOptional()
  mid?: string;

  @ValidateNested()
  @Type(() => ReplyToDto)
  @IsOptional()
  replyTo?: ReplyToDto;
}

export class TypingDto {
  @IsBoolean()
  typing!: boolean;
}

export class ReactionDto {
  @IsString()
  @MaxLength(8)
  emoji!: string;
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

  @IsNumber()
  @Min(0.25)
  @Max(4)
  @IsOptional()
  rate?: number;
}
