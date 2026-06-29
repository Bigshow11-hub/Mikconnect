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

describe('Auth', () => {
  beforeEach(cleanup);

  it('POST /api/auth/register - cree un utilisateur', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User', email: 'test-auth@test.com', password: '123456',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test-auth@test.com');
  });

  it('POST /api/auth/register - rejet email duplique', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'First', email: 'dup@test.com', password: '123456',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Second', email: 'dup@test.com', password: '123456',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login - connexion valide', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login User', email: 'login@test.com', password: '123456',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com', password: '123456',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /api/auth/login - rejet mauvais mot de passe', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Bad PW', email: 'badpw@test.com', password: '123456',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'badpw@test.com', password: 'wrongpass',
    });
    expect(res.status).toBe(401);
  });

  it('GET /api/health - health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
