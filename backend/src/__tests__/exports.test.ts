import request from 'supertest';
import { app, prisma } from '../index';

async function cleanup() {
  await prisma.voucher.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.roamingSession.deleteMany();
  await prisma.roamingSettlement.deleteMany();
  await prisma.connectionLog.deleteMany();
  await prisma.reseller.deleteMany();
  await prisma.roamingAgreement.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.hotspot.deleteMany();
  await prisma.user.deleteMany();
}

describe('Exports', () => {
  beforeEach(cleanup);

  it('Export CSV et PDF', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Export Tester', email: 'export-test@test.com', password: '123456',
    });
    const token = reg.body.token;
    const userId = reg.body.user.id;

    const hs = await request(app)
      .post('/api/hotspots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Export Hotspot', routerIp: '10.0.0.1', username: 'admin', password: 'pass' });
    const hotspotId = hs.body.id;

    const plan = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '1h 500MB', type: 'HOURLY', duration: 60, price: 500, hotspotId });
    const planId = plan.body.id;

    const gen = await request(app)
      .post('/api/vouchers/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ planId, hotspotId, quantity: 2 });
    expect(gen.status).toBe(201);

    await prisma.transaction.create({
      data: { amount: 500, method: 'WAVE', status: 'COMPLETED', reference: 'TXN-EXPORT-TEST', phoneNumber: '+22177000000', userId },
    });

    const vouchersCsv = await request(app)
      .get('/api/exports/vouchers/csv')
      .set('Authorization', `Bearer ${token}`);
    expect(vouchersCsv.status).toBe(200);
    expect(vouchersCsv.headers['content-type']).toMatch(/text\/csv/);

    const txCsv = await request(app)
      .get('/api/exports/transactions/csv')
      .set('Authorization', `Bearer ${token}`);
    expect(txCsv.status).toBe(200);
    expect(txCsv.headers['content-type']).toMatch(/text\/csv/);

    const txPdf = await request(app)
      .get('/api/exports/transactions/pdf')
      .set('Authorization', `Bearer ${token}`);
    expect(txPdf.status).toBe(200);
    expect(txPdf.headers['content-type']).toMatch(/application\/pdf/);
  });
});
