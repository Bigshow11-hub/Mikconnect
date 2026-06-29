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

describe('Plans', () => {
  beforeEach(cleanup);

  it('CRUD complet', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Plans Tester', email: 'plans-test@test.com', password: '123456',
    });
    const token = reg.body.token;

    const hs = await request(app)
      .post('/api/hotspots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Plans Hotspot', routerIp: '10.0.0.1', username: 'admin', password: 'pass' });
    const hotspotId = hs.body.id;

    const create = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '1h 500MB', type: 'HOURLY', duration: 60, price: 500, hotspotId });
    expect(create.status).toBe(201);
    expect(create.body.name).toBe('1h 500MB');
    const id = create.body.id;

    const list = await request(app)
      .get('/api/plans')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    expect(list.body.total).toBe(1);

    const update = await request(app)
      .put(`/api/plans/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '2h 1GB', price: 800 });
    expect(update.status).toBe(200);
    expect(update.body.name).toBe('2h 1GB');
  });
});
