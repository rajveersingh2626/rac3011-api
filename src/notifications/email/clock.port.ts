import { Injectable } from '@nestjs/common';

export abstract class ClockPort {
  abstract now(): Date;
}

@Injectable()
export class SystemClock extends ClockPort {
  now(): Date {
    return new Date();
  }
}
