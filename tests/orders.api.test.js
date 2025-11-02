const request = require('supertest');
const { setupApp } = require('../server');

let app;
let db;
let server;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const { app: runningApp, db: database } = await setupApp();
  app = runningApp;
  db = database;
  server = app.listen(3004); // Use a different port
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  if (db) await db.close();
});

beforeEach(async () => {
  await db.run('DELETE FROM pending_orders');
  await db.run('DELETE FROM notifications');
});

describe('Pending Orders & Notifications API', () => {
  it('should create a new pending order successfully', async () => {
    const res = await request(app).post('/api/orders/pending').send({
      account_holder_id: 2,
      ticker: 'NEW-PO',
      exchange: 'TestEx',
      order_type: 'BUY_LIMIT',
      limit_price: 150,
      quantity: 10,
      created_date: '2025-10-09',
    });
    expect(res.statusCode).toEqual(201);
  });

  it('should retrieve only ACTIVE pending orders', async () => {
    await db.run(
      "INSERT INTO pending_orders (account_holder_id, ticker, status, order_type, limit_price, quantity, created_date, exchange) VALUES (2, 'ACTIVE-A', 'ACTIVE', 'BUY_LIMIT', 10, 1, '2025-10-09', 'TestEx')"
    );
    const res = await request(app).get('/api/orders/pending?holder=2');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(1);
  });

  it('should update the status of a pending order', async () => {
    const insertRes = await db.run(
      "INSERT INTO pending_orders (account_holder_id, ticker, status, order_type, limit_price, quantity, created_date, exchange) VALUES (2, 'TO-CANCEL', 'ACTIVE', 'BUY_LIMIT', 50, 5, '2025-10-09', 'TestEx')"
    );
    const orderId = insertRes.lastID;
    const res = await request(app)
      .put(`/api/orders/pending/${orderId}`)
      .send({ status: 'CANCELLED' });
    expect(res.statusCode).toEqual(200);
  });

  it('should retrieve only UNREAD notifications', async () => {
    await db.run(
      "INSERT INTO notifications (account_holder_id, message, status) VALUES (2, 'Test message for user 2', 'UNREAD')"
    );
    const res = await request(app).get('/api/orders/notifications?holder=2');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(1);
  });

  it('should update the status of a notification', async () => {
    const insertRes = await db.run(
      "INSERT INTO notifications (account_holder_id, message, status) VALUES (2, 'To be dismissed', 'UNREAD')"
    );
    const notificationId = insertRes.lastID;
    const res = await request(app)
      .put(`/api/orders/notifications/${notificationId}`)
      .send({ status: 'DISMISSED' });
    expect(res.statusCode).toEqual(200);
  });
});
