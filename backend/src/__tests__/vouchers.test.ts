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

describe('Vouchers', () => {
  beforeEach(cleanup);

  it('Generation et validation de tickets', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'V Test', email: 'v-test@test.com', password: '123456',
    });
    const token = reg.body.token;

    const hs = await request(app)
      .post('/api/hotspots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'V Hotspot', routerIp: '10.0.0.1', username: 'admin', password: 'pass' });
    const hotspotId = hs.body.id;

    const plan = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '1h 500MB', type: 'HOURLY', duration: 60, price: 500, hotspotId });
    const planId = plan.body.id;

    const gen = await request(app)
      .post('/api/vouchers/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ planId, hotspotId, quantity: 3 });
    expect(gen.status).toBe(201);
    expect(gen.body.codes).toHaveLength(3);
    const code = gen.body.codes[0];

    const list = await request(app)
      .get('/api/vouchers')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(3);
    expect(list.body.total).toBeGreaterThanOrEqual(3);

    const valid = await request(app)
      .post('/api/vouchers/validate')
      .send({ code, hotspotId });
    expect(valid.status).toBe(200);
    expect(valid.body).toHaveProperty('valid', true);
  });
});
