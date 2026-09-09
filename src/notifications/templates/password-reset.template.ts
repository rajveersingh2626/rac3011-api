import { str } from './data';
import { defineTemplate } from './layout';

export const passwordResetTemplate = defineTemplate({
  subject: () => 'Reset your Rotaract District 3011 password',
  body: (data) => ({
    heading: 'Reset your password',
    paragraphs: [
      `Hi ${str(data, 'name', 'there')},`,
      'We received a request to reset your password for the Rotaract District 3011 Portal. Click the button below to choose a new password.',
      'This link will expire in 1 hour. If you did not request this, you can safely ignore this email.',
    ],
    cta: {
      label: 'Reset Password',
      url: str(data, 'url'),
    },
  }),
  push: () => ({
    title: 'Password reset request',
    body: 'A password reset was requested for your account.',
    url: '/portal/login',
  }),
});
