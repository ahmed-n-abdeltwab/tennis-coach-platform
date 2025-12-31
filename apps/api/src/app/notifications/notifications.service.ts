import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { SessionsService } from './../sessions/sessions.service';
import { MailResponse, SendEmailDto } from './dto/notification.dto';
import { MailerService } from './mailer';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly sessionsService: SessionsService
  ) {}

  async sendEmail(emailDto: SendEmailDto, _userId: string, _role: Role): Promise<MailResponse> {
    const { to, subject, html, text } = emailDto;

    const result = await this.mailerService.sendMail({
      to,
      subject,
      html,
      text,
    });

    return result;
  }

  async sendBookingConfirmation(sessionId: string, userId: string, role: Role) {
    const session = await this.sessionsService.findOne(sessionId, userId, role);

    if (!session) throw new UnauthorizedException('you must create session first');

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
        <li><strong>Price:</strong> ${session.price}</li>
      </ul>
      <p>See you on the court!</p>
    `;

    await this.mailerService.sendMail({
      to: session.user.email,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''),
    });
  }
}
