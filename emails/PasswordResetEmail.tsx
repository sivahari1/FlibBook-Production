import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
}

export const PasswordResetEmail = ({
  userName,
  resetUrl,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your FlipBook DRM password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Password Reset Request</Heading>
          <Text style={paragraph}>Hi {userName},</Text>
          <Text style={paragraph}>
            We received a request to reset your password for your FlipBook DRM
            account. Click the button below to create a new password.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
          </Section>
          <Text style={paragraph}>Or copy and paste this URL into your browser:</Text>
          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>
          <Text style={warningText}>
            <strong>Security Notice:</strong> This link will expire in 1 hour for
            your security. If you didn&apos;t request a password reset, please ignore
            this email and your password will remain unchanged.
          </Text>
          <Text style={footer}>
            If you&apos;re having trouble accessing your account, please contact our
            support team.
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} FlipBook DRM. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#1f2937',
  padding: '0 48px',
  marginTop: '48px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#4b5563',
  padding: '0 48px',
  marginTop: '16px',
};

const buttonContainer = {
  padding: '27px 48px',
};

const button = {
  backgroundColor: '#ef4444',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
};

const link = {
  color: '#3b82f6',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  padding: '0 48px',
  display: 'block',
  marginTop: '8px',
};

const warningText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#dc2626',
  padding: '16px 48px',
  marginTop: '24px',
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #ef4444',
};

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.5',
  padding: '0 48px',
  marginTop: '24px',
};
