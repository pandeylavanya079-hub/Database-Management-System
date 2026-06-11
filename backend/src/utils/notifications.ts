import dotenv from 'dotenv';
dotenv.config();

export interface NotificationResult {
  success: boolean;
  message?: string;
  sid?: string;
}

export const sendWhatsAppNotification = async (mobile: string, body: string): Promise<NotificationResult> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Default sandbox number

  if (!accountSid || !authToken) {
    console.log(`[SIMULATED WHATSAPP] to: ${mobile}, body: "${body}"`);
    return {
      success: true,
      message: 'Simulated WhatsApp notification logged successfully (Twilio credentials missing)'
    };
  }

  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    let cleanNumber = mobile.replace(/[^0-9]/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    const to = `whatsapp:+${cleanNumber}`;

    const res = await client.messages.create({ body, from, to });
    return { success: true, sid: res.sid };
  } catch (error: any) {
    console.error(`[REAL WHATSAPP ERROR] to: ${mobile}, error: ${error.message}`);
    return { success: false, message: error.message };
  }
};

export const sendSMSNotification = async (mobile: string, body: string): Promise<NotificationResult> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_NUMBER || '+15017122661'; // Default sandbox number

  if (!accountSid || !authToken) {
    console.log(`[SIMULATED SMS] to: ${mobile}, body: "${body}"`);
    return {
      success: true,
      message: 'Simulated SMS notification logged successfully (Twilio credentials missing)'
    };
  }

  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    let cleanNumber = mobile.replace(/[^0-9]/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    const to = `+${cleanNumber}`;

    const res = await client.messages.create({ body, from, to });
    return { success: true, sid: res.sid };
  } catch (error: any) {
    console.error(`[REAL SMS ERROR] to: ${mobile}, error: ${error.message}`);
    return { success: false, message: error.message };
  }
};

export const sendEmailNotification = async (email: string, subject: string, body: string): Promise<NotificationResult> => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'no-reply@pitambaradairy.com';

  if (!host || !user || !pass) {
    console.log(`[SIMULATED EMAIL] to: ${email}, subject: "${subject}", body: "${body}"`);
    return {
      success: true,
      message: 'Simulated Email notification logged successfully (SMTP credentials missing)'
    };
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const res = await transporter.sendMail({
      from,
      to: email,
      subject,
      text: body
    });

    return { success: true, sid: res.messageId };
  } catch (error: any) {
    console.error(`[REAL EMAIL ERROR] to: ${email}, error: ${error.message}`);
    return { success: false, message: error.message };
  }
};
