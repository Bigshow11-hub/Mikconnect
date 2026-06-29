import axios from 'axios';

interface SmsConfig {
  provider: 'twilio' | 'africastalking' | 'custom';
  apiKey: string;
  apiSecret?: string;
  from: string;
  apiUrl?: string;
}

interface WhatsAppConfig {
  provider: 'twilio' | 'whatsapp_cloud' | 'wati';
  apiKey: string;
  apiSecret?: string;
  from: string;
  apiUrl?: string;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export class NotificationService {
  private smsConfig?: SmsConfig;
  private whatsappConfig?: WhatsAppConfig;
  private telegramConfig?: TelegramConfig;

  configureSms(config: SmsConfig) { this.smsConfig = config; }
  configureWhatsApp(config: WhatsAppConfig) { this.whatsappConfig = config; }
  configureTelegram(config: TelegramConfig) { this.telegramConfig = config; }

  async sendSms(to: string, message: string): Promise<any> {
    if (!this.smsConfig) throw new Error('SMS not configured');
    const config = this.smsConfig;

    if (config.provider === 'africastalking') {
      const { data } = await axios.post(
        config.apiUrl || 'https://api.africastalking.com/version1/messaging',
        new URLSearchParams({
          username: config.apiKey,
          to,
          message,
          from: config.from,
        }),
        { headers: { 'apiKey': config.apiSecret || '', 'Accept': 'application/json' } }
      );
      return data;
    }

    if (config.provider === 'twilio') {
      const { data } = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${config.apiKey}/Messages.json`,
        new URLSearchParams({ To: to, From: config.from, Body: message }),
        {
          auth: { username: config.apiKey, password: config.apiSecret || '' },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      return data;
    }

    if (config.provider === 'custom' && config.apiUrl) {
      const { data } = await axios.post(config.apiUrl, { to, message, from: config.from }, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
      });
      return data;
    }

    throw new Error('Unsupported SMS provider');
  }

  async sendWhatsApp(to: string, message: string): Promise<any> {
    if (!this.whatsappConfig) throw new Error('WhatsApp not configured');
    const config = this.whatsappConfig;

    if (config.provider === 'whatsapp_cloud') {
      const phoneNumberId = config.from;
      const { data } = await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'text',
          text: { body: message },
        },
        { headers: { 'Authorization': `Bearer ${config.apiKey}` } }
      );
      return data;
    }

    if (config.provider === 'twilio') {
      const { data } = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${config.apiKey}/Messages.json`,
        new URLSearchParams({ To: `whatsapp:${to}`, From: `whatsapp:${config.from}`, Body: message }),
        {
          auth: { username: config.apiKey, password: config.apiSecret || '' },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      return data;
    }

    throw new Error('Unsupported WhatsApp provider');
  }

  async sendTelegram(message: string): Promise<any> {
    if (!this.telegramConfig) throw new Error('Telegram not configured');
    const { data } = await axios.post(
      `https://api.telegram.org/bot${this.telegramConfig.botToken}/sendMessage`,
      {
        chat_id: this.telegramConfig.chatId,
        text: message,
        parse_mode: 'HTML',
      }
    );
    return data;
  }

  async sendVoucherNotification(to: string, code: string, plan: string, price: number, method: 'sms' | 'whatsapp' | 'telegram'): Promise<any> {
    const message = `MikConnect - Votre code WiFi: ${code}\nOffre: ${plan}\nPrix: ${price} XOF\nValide 24h`;

    switch (method) {
      case 'sms': return this.sendSms(to, message);
      case 'whatsapp': return this.sendWhatsApp(to, message);
      case 'telegram': return this.sendTelegram(message);
    }
  }
}

export const notificationService = new NotificationService();
