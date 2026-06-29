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

describe('Roaming', () => {
  beforeEach(cleanup);

  it('Gestion des accords de roaming', async () => {
    const regA = await request(app).post('/api/auth/register').send({
      name: 'Roam A', email: 'roam-a@test.com', password: '123456',
    });
    const tokenA = regA.body.token;
    const userIdA = regA.body.user.id;

    const regB = await request(app).post('/api/auth/register').send({
      name: 'Roam B', email: 'roam-b@test.com', password: '123456',
    });
    const userIdB = regB.body.user.id;

    const hsA = await request(app)
      .post('/api/hotspots')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Roam Hotspot A', routerIp: '10.0.0.1', username: 'admin', password: 'pass' });
    const hotspotIdA = hsA.body.id;

    const hsB = await request(app)
      .post('/api/hotspots')
      .set('Authorization', `Bearer ${regB.body.token}`)
      .send({ name: 'Roam Hotspot B', routerIp: '10.0.0.2', username: 'admin', password: 'pass' });
    const hotspotIdB = hsB.body.id;

    const create = await request(app)
      .post('/api/roaming/agreements')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Accord Dakar-Thies', providerIspId: userIdA, consumerIspId: userIdB, roamingFee: 0.05 });
    expect(create.status).toBe(201);
    expect(create.body.name).toBe('Accord Dakar-Thies');

    const list = await request(app)
      .get('/api/roaming/agreements')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    expect(list.body.total).toBe(1);
  });
});
