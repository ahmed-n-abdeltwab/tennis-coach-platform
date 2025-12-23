/**
 * Notification mock factory for creating test notification data
 */

import { BaseMockFactory } from './base-factory';

export interface MockNotification {
  id: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  sentAt: Date;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MockEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class NotificationMockFactory extends BaseMockFactory<MockNotification> {
  create(overrides?: Partial<MockNotification>): MockNotification {
    const id = this.generateId();

    return {
      id,
      to: this.randomEmail(),
      subject: this.randomSubject(),
      text: this.randomText(),
      html: this.randomHtml(),
      sentAt: new Date(),
      success: true,
      messageId: this.generateId(),
      ...overrides,
    };
  }

  createEmailResult(success = true, overrides?: Partial<MockEmailResult>): MockEmailResult {
    if (success) {
      return {
        success: true,
        messageId: this.generateId(),
        ...overrides,
      };
    } else {
      return {
        success: false,
        error: 'Email sending failed',
        ...overrides,
      };
    }
  }

  createBookingConfirmation(
    userEmail: string,
    userName: string,
    coachName: string,
    overrides?: Partial<MockNotification>
  ): MockNotification {
    return this.create({
      to: userEmail,
      subject: 'Booking Confirmation - Tennis Coaching Session',
      html: this.createBookingConfirmationHtml(userName, coachName),
      text: this.createBookingConfirmationText(userName, coachName),
      ...overrides,
    });
  }

  createSessionReminder(
    userEmail: string,
    userName: string,
    sessionDate: Date,
    overrides?: Partial<MockNotification>
  ): MockNotification {
    return this.create({
      to: userEmail,
      subject: 'Session Reminder - Tennis Coaching',
      html: this.createSessionReminderHtml(userName, sessionDate),
      text: this.createSessionReminderText(userName, sessionDate),
      ...overrides,
    });
  }

  createPasswordReset(userEmail: string, overrides?: Partial<MockNotification>): MockNotification {
    return this.create({
      to: userEmail,
      subject: 'Password Reset Request',
      html: this.createPasswordResetHtml(),
      text: this.createPasswordResetText(),
      ...overrides,
    });
  }

  createWelcomeEmail(
    userEmail: string,
    userName: string,
    overrides?: Partial<MockNotification>
  ): MockNotification {
    return this.create({
      to: userEmail,
      subject: 'Welcome to Tennis Coaching Platform',
      html: this.createWelcomeHtml(userName),
      text: this.createWelcomeText(userName),
      ...overrides,
    });
  }

  private randomEmail(): string {
    const domains = ['example.com', 'test.com', 'demo.org'];
    const names = ['john', 'jane', 'mike', 'sarah', 'alex'];
    const name = names[Math.floor(Math.random() * names.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${name}@${domain}`;
  }

  private randomSubject(): string {
    const subjects = [
      'Booking Confirmation',
      'Session Reminder',
      'Password Reset',
      'Welcome to Tennis Coaching',
      'Session Cancelled',
      'Payment Confirmation',
      'Schedule Update',
    ];
    return subjects[Math.floor(Math.random() * subjects.length)] ?? 'Welcome to Tennis Coaching';
  }

  private randomText(): string {
    return 'This is a test email notification.';
  }

  private randomHtml(): string {
    return '<p>This is a test email notification.</p>';
  }

  private createBookingConfirmationHtml(userName: string, coachName: string): string {
    return `
      <h2>Booking Confirmed!</h2>
      <p>Dear ${userName},</p>
      <p>Your tennis coaching session has been confirmed:</p>
      <ul>
        <li><strong>Coach:</strong> ${coachName}</li>
        <li><strong>Type:</strong> Individual Lesson</li>
        <li><strong>Date & Time:</strong> ${new Date().toLocaleString()}</li>
        <li><strong>Duration:</strong> 60 minutes</li>
        <li><strong>Price:</strong> $50</li>
      </ul>
      <p>See you on the court!</p>
    `;
  }

  private createBookingConfirmationText(userName: string, coachName: string): string {
    return `
      Booking Confirmed!

      Dear ${userName},

      Your tennis coaching session has been confirmed:
      - Coach: ${coachName}
      - Type: Individual Lesson
      - Date & Time: ${new Date().toLocaleString()}
      - Duration: 60 minutes
      - Price: $50

      See you on the court!
    `;
  }

  private createSessionReminderHtml(userName: string, sessionDate: Date): string {
    return `
      <h2>Session Reminder</h2>
      <p>Dear ${userName},</p>
      <p>This is a reminder that you have a tennis coaching session scheduled for:</p>
      <p><strong>${sessionDate.toLocaleString()}</strong></p>
      <p>Please arrive 10 minutes early and bring your racket and water bottle.</p>
    `;
  }

  private createSessionReminderText(userName: string, sessionDate: Date): string {
    return `
      Session Reminder

      Dear ${userName},

      This is a reminder that you have a tennis coaching session scheduled for:
      ${sessionDate.toLocaleString()}

      Please arrive 10 minutes early and bring your racket and water bottle.
    `;
  }

  private createPasswordResetHtml(): string {
    return `
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password.</p>
      <p>Click the link below to reset your password:</p>
      <a href="https://example.com/reset-password?token=abc123">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `;
  }

  private createPasswordResetText(): string {
    return `
      Password Reset Request

      You have requested to reset your password.

      Click the link below to reset your password:
      https://example.com/reset-password?token=abc123

      If you did not request this, please ignore this email.
    `;
  }

  private createWelcomeHtml(userName: string): string {
    return `
      <h2>Welcome to Tennis Coaching Platform!</h2>
      <p>Dear ${userName},</p>
      <p>Welcome to our tennis coaching platform. We're excited to help you improve your game!</p>
      <p>You can now:</p>
      <ul>
        <li>Browse available coaches</li>
        <li>Book coaching sessions</li>
        <li>Track your progress</li>
        <li>Communicate with your coaches</li>
      </ul>
      <p>Get started by booking your first session!</p>
    `;
  }

  private createWelcomeText(userName: string): string {
    return `
      Welcome to Tennis Coaching Platform!

      Dear ${userName},

      Welcome to our tennis coaching platform. We're excited to help you improve your game!

      You can now:
      - Browse available coaches
      - Book coaching sessions
      - Track your progress
      - Communicate with your coaches

      Get started by booking your first session!
    `;
  }
}
