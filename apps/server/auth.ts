import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './src/db/schema';
import { BetterAuthEnv } from './src/lib/env';
import { sendEmail } from './src/lib/email';
import { jwt } from 'better-auth/plugins/jwt';

export function auth(env: BetterAuthEnv['Bindings']) {
  const db = drizzle(env.DB, { schema });
  try {
    return betterAuth({
      database: drizzleAdapter(db, {
        provider: 'sqlite',
        schema,
        usePlural: true,
      }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      user: {
        additionalFields: {
          tier: {
            type: 'string',
            required: true,
            defaultValue: 'free',
            input: false,
          },
        },
      },
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        async sendResetPassword({ user, url }) {
          await sendEmail({
            to: user.email,
            subject: 'Reset your password',
            template: 'reset-password',
            data: { name: user.name, resetUrl: url },
            env,
          });
        },
      },
      emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        async sendVerificationEmail({ user, url }) {
          console.log('Sending verification email to:', user.email, 'with URL:', url);
          await sendEmail({
            to: user.email,
            subject: 'Verify your email',
            template: 'verify-email',
            data: { name: user.name, verificationUrl: url },
            env,
          });
        },
      },
      plugins: [jwt()],
    });
  } catch (error) {
    console.error('Error creating auth:', error);
    throw error;
  }
}
