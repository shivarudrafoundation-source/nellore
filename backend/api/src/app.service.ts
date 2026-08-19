import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Siva Rudra Foundation API Service is active.';
  }
}
