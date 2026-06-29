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

describe('Hotspots', () => {
  beforeEach(cleanup);

  it('CRUD complet', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Hotspot Tester', email: 'hs-test@test.com', password: '123456',
    });
    const token = reg.body.token;

    const create = await request(app)
      .post('/api/hotspots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Hotspot', location: 'Dakar', routerIp: '192.168.1.1', username: 'admin', password: 'admin123' });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const list = await request(app)
      .get('/api/hotspots')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    expect(list.body.total).toBe(1);

    const detail = await request(app)
      .get(`/api/hotspots/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.name).toBe('Test Hotspot');

    const update = await request(app)
      .put(`/api/hotspots/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });
    expect(update.status).toBe(200);
    expect(update.body.name).toBe('Updated');
  });
});
