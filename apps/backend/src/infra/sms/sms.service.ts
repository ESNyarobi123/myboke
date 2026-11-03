import { Injectable, Logger } from '@nestjs/common';

/**
 * SmsService — mtoa huduma wa SMS.
 *
 * Kwa maendeleo (NODE_ENV !== production) ujumbe unarekodiwa kwenye log
 * na code inarudishwa kwenye response ili mtihani uwezekane bila gharama.
 * Kwa uzalishaji unganisha Beem / Africa's Talking kupitia env vars.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger('SMS');

  get isDev(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  async send(phone: string, message: string): Promise<{ sent: boolean; provider: string }> {
    const provider = process.env.SMS_PROVIDER ?? 'console';

    if (this.isDev || provider === 'console' || !process.env.SMS_API_KEY) {
      this.logger.log(`[${provider}] → ${phone}: ${message}`);
      return { sent: true, provider: 'console' };
    }

    // Uzalishaji: Beem Africa
    const res = await fetch('https://apisms.beem.africa/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${process.env.SMS_API_KEY}:${process.env.SMS_SECRET_KEY ?? ''}`,
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        source_addr: process.env.SMS_SENDER_ID ?? 'MYBOKE',
        schedule_time: '',
        encoding: 0,
        message,
        recipients: [{ recipient_id: 1, dest_addr: phone }],
      }),
    });

    if (!res.ok) {
      this.logger.error(`SMS imeshindikana (${res.status}) kwa ${phone}`);
      return { sent: false, provider };
    }
    return { sent: true, provider };
  }
}
