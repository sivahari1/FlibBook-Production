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

interface VerificationEmailProps {
  userName: string;
  verificationUrl: string;
}

export const VerificationEmail = ({
  userName,
  verificationUrl,
}: VerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your FlipBook DRM account</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Welcome to FlipBook DRM!</Heading>
          <Text style={paragraph}>Hi {userName},</Text>
          <Text style={paragraph}>
            Thanks for signing up! Please verify your email address to get
            started with FlipBook DRM and begin protecting your PDF documents.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={verificationUrl}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={paragraph}>Or copy and paste this URL into your browser:</Text>
          <Link href={verificationUrl} style={link}>
            {verificationUrl}
          </Link>
          <Text style={footer}>
            This link will expire in 24 hours. If you didn&apos;t create an account
            with FlipBook DRM, you can safely ignore this email.
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} FlipBook DRM. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default VerificationEmail;

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
  backgroundColor: '#3b82f6',
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

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.5',
  padding: '0 48px',
  marginTop: '24px',
};
