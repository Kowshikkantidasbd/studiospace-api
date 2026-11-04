
import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, mongoReady } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const env = process.env;
const isProd = env.NODE_ENV === 'production';

export const PORT = isProd && env.PORT ? Number(env.PORT) : 3000;
const JWT_SECRET = env.JWT_SECRET || 'studiospace-super-secure-jwt-secret-key-2026';
if (isProd && !env.JWT_SECRET) console.warn('WARNING: JWT_SECRET is not set. Add it to your environment variables.');

const ADMIN_EMAILS = (env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const UPLOADS_DIR = env.VERCEL
  ? '/tmp/uploads'
  : env.UPLOADS_DIR
  ? path.resolve(env.UPLOADS_DIR)
  : fs.existsSync(path.resolve(__dirname, '../public'))
  ? path.resolve(__dirname, '../public/uploads')
  : path.resolve(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const newId = (prefix) => `${prefix}_${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const avatar = (name) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const cookieBase = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' };

const startSession = (res, user) => {
  const safeUser = { id: user.id, name: user.name, email: user.email, photoUrl: user.photoUrl };
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
  return { user: safeUser, token };
};

const readUser = (req) => {
  const header = req.headers.authorization || '';
  const token = req.cookies?.token || (header.startsWith('Bearer ') ? header.slice(7) : null);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  const user = readUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  req.user = user;
  next();
};

const getEditableStudio = async (req, res) => {
  const studio = await db.collection('studios').findOne({ id: req.params.id });
  if (!studio) return void res.status(404).json({ error: 'Studio not found' });
  if (studio.hostId !== req.user.id && !ADMIN_EMAILS.includes(String(req.user.email).toLowerCase())) {
    return void res.status(403).json({ error: 'You are not allowed to modify this studio' });
  }
  return studio;
};

export const app = express();

const allowedOrigins = [
  env.CLIENT_URL,
  env.APP_URL,
  env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`,
  env.VERCEL_URL && `https://${env.VERCEL_URL}`,
  ...(isProd ? [] : ['http://localhost:3000', 'http://localhost:5173']),
]
  .filter(Boolean)
  .flatMap((s) => s.split(','))
  .map((s) => s.trim().replace(/\/$/, ''));

app.use(h(async (_req, _res, next) => { await mongoReady; next(); }));
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)), credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.post('/api/auth/register', h(async (req, res) => {
  const { name, email, password, photoUrl } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });
  if (password.length < 6 || !/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and minimum 6 characters' });
  }
  const userEmail = String(email).toLowerCase().trim();
  if (await db.collection('users').findOne({ email: userEmail })) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }
  const user = {
    id: newId('usr'),
    name: String(name).trim(),
    email: userEmail,
    passwordHash: await bcrypt.hash(password, 10),
    photoUrl: photoUrl || avatar(name),
    createdAt: new Date().toISOString(),
  };
  await db.collection('users').insertOne(user);
  res.status(201).json({ ...startSession(res, user), message: 'Account registered successfully' });
}));

app.post('/api/auth/login', h(async (req, res) => {
  const { email, password } = req.body;
  const user = await db.collection('users').findOne({ email: String(email || '').toLowerCase().trim() });
  if (!user?.passwordHash || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ ...startSession(res, user), message: 'Signed in successfully' });
}));

app.post('/api/auth/google', h(async (req, res) => {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: 'Google sign-in is not configured on the server' });

  const { accessToken } = req.body || {};
  if (!accessToken || typeof accessToken !== 'string') return res.status(400).json({ error: 'Google access token is required' });

  const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  if (!infoRes.ok) return res.status(401).json({ error: 'Invalid Google token' });
  const info = await infoRes.json();
  if (info.aud !== clientId && info.azp !== clientId) return res.status(401).json({ error: 'Google token was not issued for this app' });

  const profRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!profRes.ok) return res.status(401).json({ error: 'Could not read Google profile' });
  const profile = await profRes.json();
  if (!profile.email || String(profile.email_verified) !== 'true') return res.status(401).json({ error: 'Your Google email is not verified' });

  const email = String(profile.email).toLowerCase().trim();
  const name = String(profile.name || email.split('@')[0]).trim();
  let user = await db.collection('users').findOne({ email });
  if (!user) {
    user = { id: newId('usr_g'), name, email, photoUrl: profile.picture || avatar(name), createdAt: new Date().toISOString() };
    await db.collection('users').insertOne(user);
  }
  res.json({ ...startSession(res, user), message: 'Google account authenticated' });
}));

app.get('/api/auth/me', (req, res) => {
  const user = readUser(req);
  res.status(user ? 200 : 401).json({ user });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token', cookieBase);
  res.json({ message: 'Signed out successfully' });
});

app.patch('/api/auth/profile', requireAuth, h(async (req, res) => {
  const { name, photoUrl, currentPassword, newPassword } = req.body;

  const user = await db.collection('users').findOne({ id: req.user.id });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (photoUrl !== undefined) updates.photoUrl = String(photoUrl).trim();

  if (newPassword && String(newPassword).trim() !== '') {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to set a new password' });
    }

    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(String(currentPassword), user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    updates.passwordHash = await bcrypt.hash(String(newPassword), 10);
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  await db.collection('users').updateOne(
    { id: req.user.id },
    { $set: updates }
  );

  const updatedUser = await db.collection('users').findOne({ id: req.user.id });
  const sessionData = startSession(res, updatedUser);

  res.json({
    user: sessionData.user,
    message: 'Profile and password updated successfully'
  });
}));

const EDITABLE_FIELDS = [
  'title', 'category', 'hourlyRate', 'securityDeposit', 'capacity', 'location', 'address',
  'imageUrl', 'galleryImages', 'amenities', 'overview', 'dimensions', 'powerSupply', 'noiseIsolation',
];

app.get('/api/studios', h(async (req, res) => {
  const { category, search, maxPrice, limit, featured } = req.query;
  let studios = await db.collection('studios').find().toArray();
  if (category && category !== 'All') studios = studios.filter((s) => s.category === category);
  if (featured === 'true') studios = studios.filter((s) => s.isFeatured);
  if (search) {
    const q = String(search).toLowerCase();
    studios = studios.filter((s) => [s.title, s.location, s.category].some((v) => v.toLowerCase().includes(q)));
  }
  if (maxPrice) studios = studios.filter((s) => s.hourlyRate <= Number(maxPrice));
  if (limit) studios = studios.slice(0, Number(limit));
  res.json({ studios, total: studios.length });
}));

app.get('/api/studios/:id', h(async (req, res) => {
  const studio = await db.collection('studios').findOne({ id: req.params.id });
  if (!studio) return res.status(404).json({ error: 'Studio not found' });
  res.json({ studio });
}));

app.post('/api/studios', requireAuth, h(async (req, res) => {
  const b = req.body;
  if (!b.title || !b.category || !b.hourlyRate || !b.location) {
    return res.status(400).json({ error: 'Title, category, hourly rate, and location are required' });
  }
  const mainImg = b.imageUrl?.trim() || '/assets/images/hero_photo_studio_1793389976489.jpg';
  const studio = {
    id: newId('std'),
    title: b.title.trim(),
    category: b.category,
    hourlyRate: Number(b.hourlyRate),
    securityDeposit: Number(b.securityDeposit || 0),
    capacity: Number(b.capacity || 10),
    location: b.location.trim(),
    address: b.address?.trim() || b.location.trim(),
    imageUrl: mainImg,
    galleryImages: Array.isArray(b.galleryImages) && b.galleryImages.length ? b.galleryImages : [mainImg],
    amenities: Array.isArray(b.amenities) ? b.amenities : ['High-Speed WiFi', 'Climate Control'],
    overview: b.overview?.trim() || 'Premium creative workspace.',
    dimensions: b.dimensions || '30ft x 40ft · 14ft Ceilings',
    powerSupply: b.powerSupply || 'Standard 20A commercial circuits',
    noiseIsolation: b.noiseIsolation || 'Acoustically insulated space',
    rating: 5.0,
    reviewCount: 1,
    hostId: req.user.id,
    hostName: req.user.name,
    hostEmail: req.user.email,
    hostAvatar: req.user.photoUrl,
    isFeatured: false,
    createdAt: new Date().toISOString(),
  };
  await db.collection('studios').insertOne(studio);
  res.status(201).json({ studio, message: 'Studio listed successfully!' });
}));

app.put('/api/studios/:id', requireAuth, h(async (req, res) => {
  if (!(await getEditableStudio(req, res))) return;
  const changes = pick(req.body, EDITABLE_FIELDS);
  if (!Object.keys(changes).length) return res.status(400).json({ error: 'Nothing to update' });
  await db.collection('studios').updateOne({ id: req.params.id }, { $set: changes });
  const studio = await db.collection('studios').findOne({ id: req.params.id });
  res.json({ studio, message: 'Studio updated successfully!' });
}));

app.delete('/api/studios/:id', requireAuth, h(async (req, res) => {
  if (!(await getEditableStudio(req, res))) return;
  await db.collection('studios').deleteOne({ id: req.params.id });
  res.json({ message: 'Studio listing deleted successfully' });
}));

app.get('/api/my-listings', requireAuth, h(async (req, res) => {
  const listings = await db.collection('studios').find({ hostId: req.user.id }).toArray();
  res.json({ listings, total: listings.length });
}));

app.get('/api/my-bookings', requireAuth, h(async (req, res) => {
  const bookings = await db.collection('bookings').find({ userId: req.user.id }).toArray();
  res.json({ bookings, total: bookings.length });
}));

app.post('/api/bookings', requireAuth, h(async (req, res) => {
  const { studioId, date, startTime, endTime, specialRequests } = req.body;
  if (!studioId || !date || !startTime || !endTime) return res.status(400).json({ error: 'Studio, date, start and end time are required' });

  const studio = await db.collection('studios').findOne({ id: String(studioId) });
  if (!studio) return res.status(404).json({ error: 'Studio not found' });

  const hours = Math.max(1, parseInt(String(endTime), 10) - parseInt(String(startTime), 10));
  const subtotal = studio.hourlyRate * hours;
  const serviceFee = Math.round(subtotal * 0.1);
  const booking = {
    id: newId('bk'),
    studioId: studio.id,
    studioTitle: studio.title,
    studioImage: studio.imageUrl,
    studioLocation: studio.location,
    userId: req.user.id,
    userName: req.user.name,
    userEmail: req.user.email,
    date,
    startTime,
    endTime,
    hours,
    hourlyRate: studio.hourlyRate,
    securityDeposit: studio.securityDeposit,
    subtotal,
    serviceFee,
    totalCost: subtotal + serviceFee + studio.securityDeposit,
    specialRequests: specialRequests || '',
    status: 'Confirmed',
    createdAt: new Date().toISOString(),
  };
  await db.collection('bookings').insertOne(booking);
  res.status(201).json({ booking, message: 'Booking confirmed!' });
}));

app.patch('/api/bookings/:id/cancel', requireAuth, h(async (req, res) => {
  const filter = { id: req.params.id, userId: req.user.id };
  if (!(await db.collection('bookings').findOne(filter))) return res.status(404).json({ error: 'Booking not found' });
  await db.collection('bookings').updateOne({ id: req.params.id }, { $set: { status: 'Cancelled' } });
  res.json({ booking: await db.collection('bookings').findOne(filter), message: 'Booking cancelled' });
}));

app.get('/api/wishlist', requireAuth, h(async (req, res) => {
  const items = await db.collection('wishlist').find({ userId: req.user.id }).toArray();
  const studioIds = items.map((i) => i.studioId);
  const studios = (await db.collection('studios').find().toArray()).filter((s) => studioIds.includes(s.id));
  res.json({ studios, studioIds });
}));

app.post('/api/wishlist/toggle', requireAuth, h(async (req, res) => {
  const studioId = String(req.body.studioId || '');
  const existing = await db.collection('wishlist').findOne({ userId: req.user.id, studioId });
  if (existing) {
    await db.collection('wishlist').deleteOne({ id: existing.id });
    return res.json({ saved: false, message: 'Removed from wishlist' });
  }
  await db.collection('wishlist').insertOne({ id: newId('wsh'), userId: req.user.id, studioId, createdAt: new Date().toISOString() });
  res.json({ saved: true, message: 'Added to wishlist' });
}));

app.post('/api/upload', requireAuth, h(async (req, res) => {
  const { dataUrl, filename } = req.body;
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/[a-zA-Z0-9+-]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'A valid base64 image (dataUrl) is required' });

  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg';
  const base = String(filename || 'image').toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 30);
  const finalName = `${base}_${Date.now().toString(36)}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, finalName), buffer);

  res.status(201).json({
    success: true,
    file: { filename: finalName, url: `/uploads/${finalName}`, size: buffer.length, mimeType, uploadedAt: new Date().toISOString() },
  });
}));

app.get('/api/upload', requireAuth, h(async (_req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter((f) => !f.startsWith('.'))
    .map((filename) => {
      const stats = fs.statSync(path.join(UPLOADS_DIR, filename));
      return { filename, url: `/uploads/${filename}`, size: stats.size, uploadedAt: stats.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  res.json({ files, total: files.length });
}));

app.delete('/api/upload/:filename', requireAuth, h(async (req, res) => {
  const name = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  fs.unlinkSync(filePath);
  res.json({ success: true, message: `File ${name} deleted` });
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server' : 'Bad request' });
});

if (!env.VERCEL && !env.VITE_SERVER_ACTIVE && process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const port = Number(env.PORT) || 5000;
  app.listen(port, '0.0.0.0', () => console.log(`StudioSpace API running on http://localhost:${port}`));
}

export default app;