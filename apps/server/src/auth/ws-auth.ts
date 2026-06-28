import type { Socket } from 'socket.io';
import type { AuthService, AuthUser } from './auth.service';

// a missing or invalid token just means an anonymous guest, never an error
export function attachUser(client: Socket, auth: AuthService): void {
  const token: unknown = client.handshake.auth?.token;
  if (typeof token !== 'string' || !token) return;
  const user = auth.verifyToken(token);
  if (user) (client.data as { user?: AuthUser }).user = user;
}
