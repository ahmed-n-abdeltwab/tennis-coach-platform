import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { MailtrapTransport } from 'mailtrap';
import { MailtrapResponse, MailtrapTransporter } from 'mailtrap/dist/types/transport';
import { createTransport } from 'nodemailer';
import notificationsConfig from './config/notifications.config';
import { SendEmailDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private transporter: MailtrapTransporter;
  private readonly senderEmail: string;

  constructor(
    @Inject(notificationsConfig.KEY)
    private readonly notificationsConfiguration: ConfigType<typeof notificationsConfig>
  ) {
    const { token, senderEmail } = this.notificationsConfiguration;
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

  async sendEmail(emailDto: SendEmailDto, userId: string, role: string): Promise<MailtrapResponse> {
    const { to, subject, html, text } = emailDto;

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
    if (!info.success) {
      return {
        success: false,
        errors: info.errors,
      };
    }
    return {
      success: true,
      message_ids: info.message_ids,
    };
  }

  // TODO: need to implement email templates properly the user, coach and bookingType need to retrieve from database
  async sendBookingConfirmation(session: any) {
    const subject = 'Booking Confirmation - Tennis Coaching Session';
    const html = `
      <h2>Booking Confirmed!</h2>
      <p>Dear ${session.user.name},</p>
      <p>Your tennis coaching session has been confirmed:</p>
      <ul>
        <li><strong>Coach:</strong> ${session.coach.name}</li>
        <li><strong>Type:</strong> ${session.bookingType.name}</li>
        <li><strong>Date & Time:</strong> ${new Date(session.dateTime).toLocaleString()}</li>
        <li><strong>Duration:</strong> ${session.durationMin} minutes</li>
        <li><strong>Price:</strong> $${session.price}</li>
      </ul>
      <p>See you on the court!</p>
    `;

    await this.sendEmail(
      {
        to: session.user.email,
        subject,
        html,
        text: html.replace(/<[^>]*>/g, ''),
      },
      'system',
      'system'
    );
  }
}
