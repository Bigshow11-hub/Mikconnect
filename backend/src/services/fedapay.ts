import axios from 'axios';

interface FedaPayConfig {
  apiKey: string;
  environment: 'sandbox' | 'live';
  secretKey: string;
}

interface CreateTransactionParams {
  amount: number;
  currency: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  callbackUrl: string;
  redirectUrl: string;
}

export class FedaPayService {
  private api: ReturnType<typeof axios.create>;

  constructor(config: FedaPayConfig) {
    const baseURL = config.environment === 'sandbox'
      ? 'https://sandbox-api.fedapay.com/v1'
      : 'https://api.fedapay.com/v1';

    this.api = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Secret-Key': config.secretKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async createTransaction(params: CreateTransactionParams) {
    const { data } = await this.api.post('/transactions', {
      amount: params.amount,
      currency: params.currency || 'XOF',
      description: params.description,
      callback_url: params.callbackUrl,
      redirect_url: params.redirectUrl,
      customer: {
        firstname: params.customerName,
        email: params.customerEmail,
        phone_number: params.customerPhone,
      },
    });
    return data;
  }

  async getTransaction(id: number) {
    const { data } = await this.api.get(`/transactions/${id}`);
    return data;
  }

  async verifyWebhook(signature: string, payload: string): Promise<boolean> {
    const crypto = await import('crypto');
    const secret = process.env.FEDAPAY_WEBHOOK_SECRET || '';
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return signature === expected;
  }
}
