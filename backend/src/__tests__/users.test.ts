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

describe('Users (admin)', () => {
  beforeEach(cleanup);

  it('GET /api/users liste les utilisateurs (admin only)', async () => {
    const admin = await request(app).post('/api/auth/register').send({
      name: 'Admin', email: 'admin-users@test.com', password: 'admin123',
    });
    const adminToken = admin.body.token;

    await request(app).post('/api/auth/register').send({
      name: 'Regular', email: 'regular@test.com', password: '123456',
    });

    const list = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(2);
    expect(list.body.total).toBe(2);
  });

  it('PATCH /api/users/:id active/desactive un utilisateur', async () => {
    const admin = await request(app).post('/api/auth/register').send({
      name: 'Admin2', email: 'admin2-users@test.com', password: 'admin123',
    });

    const target = await request(app).post('/api/auth/register').send({
      name: 'Target', email: 'target@test.com', password: '123456',
    });

    const res = await request(app)
      .patch(`/api/users/${target.body.user.id}`)
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ active: false });
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });
});
