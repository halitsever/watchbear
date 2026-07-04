import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client } from 'google-auth-library';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface AuthUser {
  id: string;
  plan: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  plan: string;
}

@Injectable()
export class AuthService {
  private readonly google: OAuth2Client;
  private readonly clientId: string;
  private readonly enforceCustomize: boolean;
  private readonly enforceJoin: boolean;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.clientId = config.get<string>('GOOGLE_CLIENT_ID', '');
    this.enforceCustomize = config.get<string>('ENFORCE_LOGIN_CUSTOMIZE', 'true') !== 'false';
    this.enforceJoin = config.get<string>('ENFORCE_LOGIN_JOIN', 'true') !== 'false';
    this.google = new OAuth2Client(this.clientId);
  }

  // only an auth-configured deployment gates identity; self-hosters without a Google client don't
  isConfigured(): boolean {
    return !!this.clientId;
  }

  // customization (name/color/avatar) needs login only when enforced and auth is configured;
  // set ENFORCE_LOGIN_CUSTOMIZE=false to let guests keep chosen names during an extension rollout
  customizeRequiresLogin(): boolean {
    return this.enforceCustomize && this.isConfigured();
  }

  // joining a room needs login only when enforced and auth is configured;
  // set ENFORCE_LOGIN_JOIN=false to let guests join (self-host / rollback)
  joinRequiresLogin(): boolean {
    return this.enforceJoin && this.isConfigured();
  }

  async loginWithGoogle(idToken: string, nonce: string): Promise<{ token: string; user: PublicUser }> {
    const payload = await this.verifyGoogle(idToken, nonce);
    const user = await this.upsertUser(payload);
    const token = await this.issueToken(user);
    return { token, user: this.toPublic(user) };
  }

  private async verifyGoogle(idToken: string, nonce: string) {
    let ticket;
    try {
      ticket = await this.google.verifyIdToken({ idToken, audience: this.clientId });
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
    const payload = ticket.getPayload();
    // nonce check blocks token replay
    if (!payload || !payload.sub || !payload.email || payload.nonce !== nonce) {
      throw new UnauthorizedException('Invalid Google token');
    }
    return payload;
  }

  private async upsertUser(payload: {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<User> {
    const existing = await this.users.findOne({ where: { googleId: payload.sub } });
    const fields = {
      email: payload.email ?? '',
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    };
    if (existing) {
      Object.assign(existing, fields);
      return this.users.save(existing);
    }
    return this.users.save(this.users.create({ googleId: payload.sub, ...fields }));
  }

  private issueToken(user: User): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, email: user.email, plan: user.plan });
  }

  // synchronous so the ws handshake resolves before the first message is dispatched
  verifyToken(token: string): AuthUser | null {
    try {
      const claims = this.jwt.verify<{ sub: string; plan?: string }>(token);
      return { id: claims.sub, plan: claims.plan ?? 'free' };
    } catch {
      return null;
    }
  }

  private toPublic(user: User): PublicUser {
    return { id: user.id, email: user.email, name: user.name, picture: user.picture, plan: user.plan };
  }
}
