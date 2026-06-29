import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const sendSchema = z.object({
  type: z.enum(['sms', 'whatsapp', 'telegram']),
  to: z.string().min(1),
  message: z.string().min(1),
});

const voucherSchema = z.object({
  to: z.string().min(1),
  code: z.string().min(1),
  plan: z.string().optional(),
  price: z.coerce.number().optional(),
  method: z.enum(['sms', 'whatsapp', 'telegram']).optional(),
});

router.post('/send', validate(sendSchema), async (req: Request, res: Response) => {
  const { type, to, message } = req.body;
  const providers: Record<string, string> = { sms: 'SMS', whatsapp: 'WhatsApp', telegram: 'Telegram' };
  const provider = providers[type] || 'WhatsApp';
  console.log(`[${provider}] Sending to ${to}: ${message.substring(0, 50)}...`);
  const statuses: Record<string, string> = { sms: 'delivered', whatsapp: 'sent', telegram: 'sent' };
  res.json({ success: true, provider, to, status: statuses[type] || 'sent', timestamp: new Date().toISOString() });
});

router.post('/send-voucher', validate(voucherSchema), async (req: Request, res: Response) => {
  const { to, code, plan, price, method } = req.body;
  const message = `MikConnect - Votre code WiFi: ${code}\nOffre: ${plan || 'Standard'}\nPrix: ${price || 0} XOF\nValide 24h`;
  const providers: Record<string, string> = { sms: 'SMS', whatsapp: 'WhatsApp', telegram: 'Telegram' };
  const provider = providers[method || 'whatsapp'] || 'WhatsApp';
  console.log(`[${provider}] Voucher sent to ${to}: ${code}`);
  res.json({ success: true, provider, to, code, status: 'sent', timestamp: new Date().toISOString() });
});

router.get('/providers', async (_req: Request, res: Response) => {
  res.json({
    sms: { available: true, defaultProvider: 'africastalking', providers: ['africastalking', 'twilio'] },
    whatsapp: { available: true, defaultProvider: 'whatsapp_cloud', providers: ['whatsapp_cloud', 'twilio'] },
    telegram: { available: true, defaultProvider: 'telegram', providers: ['telegram'] },
  });
});

export default router;
