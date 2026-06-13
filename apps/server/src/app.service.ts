import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return { name: 'watchbear-server', status: 'ok' };
  }
}
