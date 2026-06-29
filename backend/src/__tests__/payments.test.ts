import request from 'supertest';
import { app, prisma } from '../index';

async function cleanup() {
  for (const table of ['vouchers', 'transactions', 'roaming_sessions', 'connection_logs', 'resellers', 'roaming_agreements', 'roaming_settlements', 'api_keys', 'plans', 'hotspots', 'users']) {
    try { await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`); } catch {}
  }
}

describe('Payments', () => {
  beforeEach(cleanup);

  it('POST /api/payments/initiate - cree une transaction', async () => {
    const res = await request(app)
      .post('/api/payments/initiate')
      .send({ amount: 500, method: 'WAVE', phoneNumber: '+22177000000' });
    expect(res.status).toBe(201);
    expect(res.body.transaction).toHaveProperty('reference');
    expect(res.body.transaction.status).toBe('PENDING');
  });

  it('POST /api/payments/webhook/momo - valide un paiement', async () => {
    const init = await request(app)
      .post('/api/payments/initiate')
      .send({ amount: 1000, method: 'MTN_MOMO', phoneNumber: '+22176000000' });
    const ref = init.body.transaction.reference;

    const webhook = await request(app)
      .post('/api/payments/webhook/momo')
      .send({ reference: ref, status: 'SUCCESS' });
    expect(webhook.status).toBe(200);
    expect(webhook.body.received).toBe(true);

    const tx = await prisma.transaction.findUnique({ where: { reference: ref } });
    expect(tx?.status).toBe('COMPLETED');
  });

  it('GET /api/payments/methods - liste les methodes', async () => {
    const res = await request(app).get('/api/payments/methods');
    expect(res.status).toBe(200);
    expect(res.body.methods.length).toBeGreaterThanOrEqual(3);
  });
});
