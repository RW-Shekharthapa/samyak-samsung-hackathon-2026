const crypto = require('crypto');
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());

const client = new MongoClient(process.env.DATABASE_URL, { serverSelectionTimeoutMS: 3000 });
const users = () => client.db().collection('users');
const SECRET = process.env.AUTH_SECRET || crypto.createHash('sha256').update(process.env.DATABASE_URL || 'dev').digest('hex');
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

const hashPassword = (pw, salt = crypto.randomBytes(16).toString('hex')) =>
  `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
const verifyPassword = (pw, stored) => {
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const sign = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${crypto.createHmac('sha256', SECRET).update(body).digest('base64url')}`;
};
const verify = (token = '') => {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  return data.exp > Date.now() ? data : null;
};
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, createdAt: u.createdAt });
const issue = (u) => ({ token: sign({ sub: String(u._id), exp: Date.now() + TOKEN_TTL_MS }), user: publicUser(u) });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(503).json({ error: 'Database error: ' + e.message }));

const auth = (req, res, next) => {
  const data = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
  if (!data) return res.status(401).json({ error: 'Not authenticated' });
  req.userId = data.sub;
  next();
};

app.get('/api/db', async (_q, r) => { try { await client.connect(); await client.db().command({ ping: 1 }); r.json({ db: 'ok' }); } catch (e) { r.status(503).json({ db: 'error', message: e.message }); } });

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body || {};
  const mail = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Name is required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return res.status(400).json({ error: 'A valid email is required' });
  if (String(password || '').length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (await users().findOne({ email: mail })) return res.status(409).json({ error: 'Email is already registered' });
  const doc = { name: String(name).trim(), email: mail, password: hashPassword(String(password)), createdAt: new Date() };
  const { insertedId } = await users().insertOne(doc);
  res.status(201).json(issue({ ...doc, _id: insertedId }));
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const u = await users().findOne({ email: String(email || '').trim().toLowerCase() });
  if (!u || !verifyPassword(String(password || ''), u.password)) return res.status(401).json({ error: 'Invalid email or password' });
  res.json(issue(u));
}));

app.get('/api/auth/me', auth, wrap(async (req, res) => {
  const { ObjectId } = require('mongodb');
  const u = await users().findOne({ _id: new ObjectId(req.userId) });
  if (!u) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: publicUser(u) });
}));

app.get('/api/dashboard', auth, wrap(async (req, res) => {
  const total = await users().countDocuments();
  const { ObjectId } = require('mongodb');
  const u = await users().findOne({ _id: new ObjectId(req.userId) });
  if (!u) return res.status(401).json({ error: 'Not authenticated' });
  const recent = await users().find({}, { projection: { name: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray();
  res.json({ totalUsers: total, memberSince: u.createdAt, recentUsers: recent.map((r) => ({ name: r.name, createdAt: r.createdAt })) });
}));

const port = process.env.PORT || 8080;
client.connect().then(() => users().createIndex({ email: 1 }, { unique: true })).catch((e) => console.error('DB:', e.message));
app.listen(port, '0.0.0.0', () => console.log('API on :' + port));
