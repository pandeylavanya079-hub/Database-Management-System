import dotenv from 'dotenv';
dotenv.config();

export const sendWhatsAppReminder = async (to: string, message: string): Promise<{ success: boolean; sid?: string; message?: string }> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Default Twilio sandbox number

  if (!accountSid || !authToken) {
    console.log(`[SIMULATED WHATSAPP OUTBOUND] to: ${to}, body: "${message}"`);
    return {
      success: true,
      message: 'Twilio credentials not found in env. Simulated message logged to backend console.'
    };
  }

  try {
    // Dynamic import to avoid crash if twilio package is not installed
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    let cleanNumber = to.replace(/[^0-9]/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    const formattedTo = `whatsapp:+${cleanNumber}`;

    const res = await client.messages.create({
      body: message,
      from,
      to: formattedTo
    });

    console.log(`[REAL WHATSAPP OUTBOUND] Sent successfully. SID: ${res.sid}`);
    return {
      success: true,
      sid: res.sid
    };
  } catch (error: any) {
    console.error(`[REAL WHATSAPP OUTBOUND ERROR] failed to send: ${error.message}`);
    return {
      success: false,
      message: error.message
    };
  }
};
