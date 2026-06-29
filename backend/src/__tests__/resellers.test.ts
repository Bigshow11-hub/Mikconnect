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

describe('Resellers', () => {
  beforeEach(cleanup);

  it('CRUD complet', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Reseller Tester', email: 'reseller-test@test.com', password: '123456',
    });
    const token = reg.body.token;

    const create = await request(app)
      .post('/api/resellers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Alpha Reseller', phone: '+22177000000', email: 'alpha@reseller.com', commission: 15 });
    expect(create.status).toBe(201);
    expect(create.body.name).toBe('Alpha Reseller');
    const id = create.body.id;

    const list = await request(app)
      .get('/api/resellers')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    expect(list.body.total).toBe(1);

    const update = await request(app)
      .put(`/api/resellers/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ commission: 20 });
    expect(update.status).toBe(200);
    expect(update.body.commission).toBe(20);
  });
});
