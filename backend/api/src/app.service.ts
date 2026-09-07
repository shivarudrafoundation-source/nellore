import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Shiva Rudra Foundation API Service is active.';
  }
}
