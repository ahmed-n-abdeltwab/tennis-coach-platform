/**
 * Nodemailer Mock
 * a mock implementation of nodemailer for tests
 * Used by both unit and integration tests to avoid sending real emails
 */

export const nodemailerMock = {
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: [],
    }),
    verify: jest.fn().mockResolvedValue(true),
  }),
};

/**
 * Setup nodemailer mock
 * Call this in setupFiles to mock nodemailer module
 */
export function setupNodemailerMock(): void {
  jest.mock('nodemailer', () => nodemailerMock);
}
