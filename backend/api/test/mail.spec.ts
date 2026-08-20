import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();
import { MailService } from '../src/mail/mail.service.js';

async function testResendIntegration() {
  console.log('========================================================');
  console.log('TESTING RESEND EMAIL SERVICE INTEGRATION');
  console.log('========================================================');

  const mailService = new MailService();

  console.log('Test 1: Testing OTP Email Generation & Dispatch');
  const otpRes = await mailService.sendOtpEmail('shivarudrafoundation@gmail.com', '123456', 'Security Test');
  console.log('  -> OTP Email result:', otpRes);

  console.log('Test 2: Testing Registration Confirmation Email');
  const regRes = await mailService.sendRegistrationConfirmationEmail('shivarudrafoundation@gmail.com', {
    name: 'Shiva Rudra Admin',
    categoryName: 'Miss Pageant',
    eventName: 'Nellore Nirajan 2026',
    registrationId: 'REG-TEST-0001',
    fee: 1000,
  });
  console.log('  -> Registration Email result:', regRes);

  console.log('Test 3: Testing Contestant Activation Email');
  const actRes = await mailService.sendContestantActivationEmail('shivarudrafoundation@gmail.com', {
    name: 'Shiva Rudra Contestant',
    contestantId: 'SRF-NLR26-MS-0001',
    categoryName: 'Miss Pageant',
    eventName: 'Nellore Nirajan 2026',
  });
  console.log('  -> Activation Email result:', actRes);

  console.log('Test 4: Testing Direct Custom Email Dispatch');
  const customRes = await mailService.sendEmail({
    to: 'shivarudrafoundation@gmail.com',
    subject: 'Hello from Siva Rudra Foundation & Resend',
    html: '<p>Congrats on configuring your <strong>Resend API</strong> in Siva Rudra Foundation!</p>',
  });
  console.log('  -> Custom Email result:', customRes);

  console.log('========================================================');
  console.log('RESEND INTEGRATION TESTS COMPLETE');
  console.log('========================================================');
}

testResendIntegration().catch((err) => {
  console.error('Mail test error:', err);
});
