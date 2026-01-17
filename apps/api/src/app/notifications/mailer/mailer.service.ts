import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { MailtrapTransport } from 'mailtrap';
import { MailtrapResponse, MailtrapTransporter } from 'mailtrap/dist/types/transport';
import { createTransport } from 'nodemailer';

import notificationsConfig from '../config/notifications.config';

export interface SendMailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface MailResult {
  success: boolean;
  message_ids?: string[];
  errors?: string[];
}

/**
 * MailerService wraps the Mailtrap transporter for sending emails.
 * This service is injectable and can be easily mocked in tests.
 */
@Injectable()
export class MailerService {
  private transporter: MailtrapTransporter;
  private readonly senderEmail: string;

  constructor(
    @Inject(notificationsConfig.KEY)
    private readonly config: ConfigType<typeof notificationsConfig>
  ) {
    const { token, senderEmail } = this.config;
    if (!token || !senderEmail) {
      throw new Error('SMTP_TOKEN and SMTP_SENDER_EMAIL must be provided');
    }
    this.transporter = createTransport(
      MailtrapTransport({
        token,
        bulk: true,
      })
    );
    this.senderEmail = senderEmail;
  }

  async sendMail(options: SendMailOptions): Promise<MailResult> {
    const { to, subject, html, text } = options;

    try {
      const info: MailtrapResponse = await this.transporter.sendMail({
        from: {
          address: this.senderEmail,
          name: 'Mailtrap Test',
        },
        to,
        subject,
        text,
        html,
      });

      if (!info?.success) {
        return {
          success: false,
          errors: info?.errors ?? ['Unknown email sending error'],
        };
      }

      return {
        success: true,
        message_ids: info.message_ids,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Email sending failed'],
      };
    }
  }
}
