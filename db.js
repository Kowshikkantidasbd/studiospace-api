/**
 * StudioSpace Backend Database Layer
 * Lightweight, persistent MongoDB-compatible database engine stored directly in backend/data/db.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database storage located inside backend/data/
const SEED_DB_FILE = path.resolve(__dirname, 'data', 'db.json');
// On Vercel the project folder is read-only, so the working copy lives in /tmp.
export const BACKEND_DATA_DIR = process.env.VERCEL ? '/tmp/studiospace-data' : path.resolve(__dirname, 'data');
export const BACKEND_DB_FILE = path.resolve(BACKEND_DATA_DIR, 'db.json');
export const ROOT_DB_FILE = path.resolve(__dirname, '../../data/db.json');

// Ensure database directory exists in backend
if (!fs.existsSync(BACKEND_DATA_DIR)) {
  fs.mkdirSync(BACKEND_DATA_DIR, { recursive: true });
}

// ----------------------------------------------------------------------
// Initial Seed Data
// ----------------------------------------------------------------------
export const SEED_STUDIOS = [
  {
    id: 'studio-1',
    title: 'Aura Infinite Cyclorama & Lightstage',
    category: 'Photo Studios',
    hourlyRate: 125,
    securityDeposit: 250,
    capacity: 20,
    location: 'Arts District, Downtown Los Angeles, CA',
    address: '840 S Santa Fe Ave, Los Angeles, CA 90021',
    imageUrl: '/assets/images/hero_photo_studio_1793389976489.jpg',
    galleryImages: [
      '/assets/images/hero_photo_studio_1793389976489.jpg',
      '/assets/images/hero_daylight_art_loft_1793389977859.jpg',
      '/assets/images/hero_sound_stage_1793389976920.jpg',
    ],
    amenities: [
      '3-Wall White Cyclorama',
      'Ceiling Light Scissor Grid',
      'Profoto Pro-11 Generators',
      'Hair & Makeup Vanity Station',
      'Drive-In Vehicle Access',
      'High-Speed 1Gbps Fiber WiFi',
      'Production Client Lounge',
      'Commercial Steamer & Wardrobe Racks',
    ],
    overview: 'A 3,200 sq.ft. high-ceiling commercial photo studio built for high-end fashion campaigns, automotive shoots, and commercial video. Features motorized sky panels, 100A 3-phase camlock drops, and private green room.',
    dimensions: '45ft x 70ft · 22ft Clear Height',
    powerSupply: '100A 3-Phase Camlock + 8x 20A Circuits',
    noiseIsolation: 'Quiet acoustic treatment (STC 50)',
    rating: 4.98,
    reviewCount: 64,
    hostId: 'host-1',
    hostName: 'Elena Rostova',
    hostEmail: 'elena@aurastudios.la',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isFeatured: true,
    createdAt: new Date('2026-01-15').toISOString(),
  },
  {
    id: 'studio-2',
    title: 'The Resonance Stage & Neve Suite',
    category: 'Sound Stages',
    hourlyRate: 160,
    securityDeposit: 300,
    capacity: 15,
    location: 'Williamsburg, Brooklyn, NY',
    address: '142 N 6th St, Brooklyn, NY 11249',
    imageUrl: '/assets/images/hero_sound_stage_1793389976920.jpg',
    galleryImages: [
      '/assets/images/hero_sound_stage_1793389976920.jpg',
      '/assets/images/hero_podcast_suite_1793389977711.jpg',
      '/assets/images/hero_photo_studio_1793389976489.jpg',
    ],
    amenities: [
      'Vintage Neve 8068 Console',
      'Barefoot Sound MicroMain27 Monitors',
      'Live Room with Hardwood Resonators',
      'Steinway Model B Grand Piano',
      'Microphone Locker (Neumann U87, Royer R-121)',
      'Isolated Vocal & Drum Booths',
      'Pro Tools HDX Ultimate Rig',
      'Lounge with Espresso Bar',
    ],
    overview: 'World-class acoustically calibrated sound stage designed by premier acoustic architects. Boasting an authentic 32-channel vintage Neve console, floating concrete slab floor, and pristine sightlines into the 1,100 sq.ft. live room.',
    dimensions: 'Live Room: 32ft x 35ft · Control Room: 22ft x 20ft',
    powerSupply: 'Dedicated Balanced Power Rig (Equi=Tech)',
    noiseIsolation: 'Double-wall floating room (STC 68 - Broadcast standard)',
    rating: 4.95,
    reviewCount: 48,
    hostId: 'user-host-01',
    hostName: 'Marcus Vance',
    hostEmail: 'host@studiospace.io',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isFeatured: true,
    createdAt: new Date('2026-02-01').toISOString(),
  },
  {
    id: 'studio-3',
    title: 'EchoStream Broadcast Podcast Suite',
    category: 'Podcast Rooms',
    hourlyRate: 85,
    securityDeposit: 150,
    capacity: 8,
    location: 'West Loop, Chicago, IL',
    address: '320 N Morgan St, Chicago, IL 60607',
    imageUrl: '/assets/images/hero_podcast_suite_1793389977711.jpg',
    galleryImages: [
      '/assets/images/hero_podcast_suite_1793389977711.jpg',
      '/assets/images/hero_sound_stage_1793389976920.jpg',
      '/assets/images/hero_photo_studio_1793389976489.jpg',
    ],
    amenities: [
      '4x Shure SM7B Microphones with Cloudlifters',
      'RodeCaster Pro II Integrated Console',
      '3-Angle 4K Blackmagic Studio Cameras',
      'ATEM Mini Extreme ISO Switcher',
      'Dimmable Philips Hue Mood Wash',
      'Custom Walnut Circular Discussion Desk',
      'Soundproofed Acoustic Slat Walls',
      'Live Stream RTMP Direct Ingestion',
    ],
    overview: 'Turn-key 4-person video podcast and livestreaming studio. Engineered for immediate plug-and-record workflow with ISO multi-track audio and multi-cam 4K ProRes video delivery on your own SSD or cloud folder.',
    dimensions: '18ft x 22ft · 11ft Acoustic Drop',
    powerSupply: 'Clean surge-isolated 20A commercial feed',
    noiseIsolation: 'NRC 0.95 Acoustic Panels & Double Seals',
    rating: 4.92,
    reviewCount: 39,
    hostId: 'host-3',
    hostName: 'Julian Chen',
    hostEmail: 'julian@echostream.co',
    hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    isFeatured: true,
    createdAt: new Date('2026-02-12').toISOString(),
  },
  {
    id: 'studio-4',
    title: 'The Industrial Sunloft Art Atelier',
    category: 'Art Workshops',
    hourlyRate: 95,
    securityDeposit: 200,
    capacity: 25,
    location: 'Mission District, San Francisco, CA',
    address: '2640 20th St, San Francisco, CA 94110',
    imageUrl: '/assets/images/hero_daylight_art_loft_1793389977859.jpg',
    galleryImages: [
      '/assets/images/hero_daylight_art_loft_1793389977859.jpg',
      '/assets/images/hero_photo_studio_1793389976489.jpg',
      '/assets/images/hero_podcast_suite_1793389977711.jpg',
    ],
    amenities: [
      'North-Facing Historic Steel Windows',
      '6 Heavy Oak Timber Workbenches',
      'Mabef Studio Painting Easels',
      'Commercial Utility Wash Basin & Clay Sink',
      'Exhaust Ventilation Hood for Resins & Oils',
      'Natural Daylight Balanced (5500K)',
      'Freight Elevator Direct to Loft Floor',
      'Dedicated Tool Library & Screen Printing Rigs',
    ],
    overview: 'Authentic 2,400 sq.ft. artist loft studio with historic architectural iron-framed windows providing unobstructed diffused northern daylight. Perfect for painting workshops, clay sculpting, screenprinting, and fine-art exhibits.',
    dimensions: '40ft x 60ft · 16ft Exposed Timber Beam',
    powerSupply: '4x Quad 20A Outlets along perimeter',
    noiseIsolation: 'Spacious open loft layout',
    rating: 4.97,
    reviewCount: 52,
    hostId: 'host-4',
    hostName: 'Sophie Laroche',
    hostEmail: 'sophie@sunloft-sf.org',
    hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    isFeatured: true,
    createdAt: new Date('2026-02-20').toISOString(),
  },
  {
    id: 'studio-5',
    title: 'Prism Dolby Atmos Music Suite',
    category: 'Music Suites',
    hourlyRate: 140,
    securityDeposit: 250,
    capacity: 6,
    location: 'Music Row, Nashville, TN',
    address: '1012 16th Ave S, Nashville, TN 37212',
    imageUrl: '/assets/images/hero_sound_stage_1793389976920.jpg',
    galleryImages: [
      '/assets/images/hero_sound_stage_1793389976920.jpg',
      '/assets/images/hero_podcast_suite_1793389977711.jpg',
    ],
    amenities: [
      'Dolby Atmos 7.1.4 Genelec SAM Monitoring',
      'Universal Audio Apollo x16 Converters',
      'Moog One, Prophet-6, Fender Rhodes 73',
      'Ergonomic Sterling Modular Mixing Desk',
      'Acoustically Tuned Bass Traps & Diffusers',
      'Herman Miller Embody Task Seating',
      'High-Resolution Ultra-Wide 49” Display',
      'Whisper Room Vocal Isolation Booth',
    ],
    overview: 'Certified Dolby Atmos mixing and spatial audio production suite. Tailored for electronic producers, mastering engineers, and film composers looking for pinpoint spatial imaging and pristine analog outboard gear.',
    dimensions: '20ft x 24ft · 12ft Ceilings',
    powerSupply: 'Furman Prestige Balanced Power',
    noiseIsolation: 'Room-within-a-room design (STC 65)',
    rating: 4.99,
    reviewCount: 31,
    hostId: 'host-5',
    hostName: 'David Mercer',
    hostEmail: 'david@prismatmos.com',
    hostAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    isFeatured: true,
    createdAt: new Date('2026-03-01').toISOString(),
  },
  {
    id: 'studio-6',
    title: 'The Foundry Daylight Warehouse Stage',
    category: 'Photo Studios',
    hourlyRate: 110,
    securityDeposit: 200,
    capacity: 30,
    location: 'Pilsen, Chicago, IL',
    address: '1800 S Carpenter St, Chicago, IL 60608',
    imageUrl: '/assets/images/hero_photo_studio_1793389976489.jpg',
    galleryImages: [
      '/assets/images/hero_photo_studio_1793389976489.jpg',
      '/assets/images/hero_daylight_art_loft_1793389977859.jpg',
    ],
    amenities: [
      'Exposed Brick & Polished Terrazzo Floors',
      'Overhead Skylights with Blackout Motor Blinds',
      'Matthews C-Stands & Boom Arms Kit',
      'V-Flats & Seamless Paper Backdrops (9ft & 12ft)',
      'Client Dining Lounge & Mini Kitchenette',
      'Roll-up Loading Dock Access',
      'Dual Hair/Makeup Mirror Stations',
      'Bluetooth Marshall Sound System',
    ],
    overview: 'Raw industrial daylight stage with rich historic textures and controllable overhead skylights. The premier choice in the Midwest for lookbook photography, music videos, and creative editorial productions.',
    dimensions: '35ft x 55ft · 18ft Ceilings',
    powerSupply: '200A Single Phase Distribution Panel',
    noiseIsolation: 'Solid brick masonry structure',
    rating: 4.94,
    reviewCount: 42,
    hostId: 'host-1',
    hostName: 'Elena Rostova',
    hostEmail: 'elena@aurastudios.la',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isFeatured: true,
    createdAt: new Date('2026-03-05').toISOString(),
  },
];

export const SEEDED_USERS = [
  {
    id: 'user-host-01',
    name: 'Marcus Vance',
    email: 'host@studiospace.io',
    passwordHash: '$2b$10$Jy.8fEiZKhwRBeJ8ukLrQu6YGE/z1afIErGykicbP0p7xWC/ASus.', // Password123
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'user-creator-01',
    name: 'Alex Rivers',
    email: 'creator@studiospace.io',
    passwordHash: '$2b$10$Jy.8fEiZKhwRBeJ8ukLrQu6YGE/z1afIErGykicbP0p7xWC/ASus.', // Password123
    photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date('2026-01-05').toISOString(),
  },
];

// ----------------------------------------------------------------------
// MongoDB Native Client & Connection
// ----------------------------------------------------------------------
export const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || '';

export let client = null;
export let mongoDbInstance = null;
export let mongoReady = Promise.resolve();

if (MONGODB_URI) {
  try {
    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    mongoReady = client.connect().then(async () => {
      console.log('✅ Connected to MongoDB database successfully');
      const dbName = process.env.MONGODB_DB_NAME || 'studiospace';
      mongoDbInstance = client.db(dbName);

      try {
        const studioCount = await mongoDbInstance.collection('studios').countDocuments();
        if (studioCount === 0) {
          await mongoDbInstance.collection('studios').insertMany(SEED_STUDIOS);
          console.log('🌱 Seeded MongoDB studios collection');
        }
        const userCount = await mongoDbInstance.collection('users').countDocuments();
        if (userCount === 0) {
          await mongoDbInstance.collection('users').insertMany(SEEDED_USERS);
          console.log('🌱 Seeded MongoDB users collection');
        }
      } catch (seedErr) {
        console.warn('MongoDB seed notice:', seedErr.message);
      }
    }).catch((err) => {
      console.warn('⚠️ MongoDB connection could not connect, using local JSON datastore:', err.message);
    });
  } catch (err) {
    console.warn('⚠️ MongoClient setup error, using local JSON datastore:', err.message);
  }
}

// ----------------------------------------------------------------------
// Backend MongoDB-Compatible In-Memory & File-Backed Store
// ----------------------------------------------------------------------
export class BackendDatabase {
  constructor() {
    this.data = { users: [], studios: [], bookings: [], wishlist: [] };
    this.init();
  }

  init() {
    try {
      // 1. Try reading from backend/data/db.json
      if (fs.existsSync(BACKEND_DB_FILE)) {
        const raw = fs.readFileSync(BACKEND_DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else if (process.env.VERCEL && fs.existsSync(SEED_DB_FILE)) {
        this.data = JSON.parse(fs.readFileSync(SEED_DB_FILE, 'utf-8'));
      } else if (fs.existsSync(ROOT_DB_FILE)) {
        // 2. Migrate existing data from root /data/db.json into backend/data/db.json
        const raw = fs.readFileSync(ROOT_DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        // 3. Fallback to initial seeds
        this.data = {
          users: SEEDED_USERS,
          studios: SEED_STUDIOS,
          wishlist: [],
          bookings: [],
        };
      }

      // Ensure defaults & seed safety
      if (!this.data.studios || this.data.studios.length === 0) {
        this.data.studios = SEED_STUDIOS;
      }
      if (!this.data.wishlist) this.data.wishlist = [];
      if (!this.data.users) this.data.users = [];
      if (!this.data.bookings) this.data.bookings = [];

      for (const u of SEEDED_USERS) {
        const idx = this.data.users.findIndex((x) => x.email.toLowerCase() === u.email.toLowerCase());
        if (idx === -1) {
          this.data.users.push(u);
        } else if (!this.data.users[idx].passwordHash) {
          this.data.users[idx].passwordHash = u.passwordHash;
        }
      }

      this.persist();
    } catch (err) {
      console.error('Error initializing backend database store:', err);
      this.data = { users: SEEDED_USERS, studios: SEED_STUDIOS, bookings: [], wishlist: [] };
    }
  }

  persist() {
    try {
      const serialized = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(BACKEND_DB_FILE, serialized, 'utf-8');
    } catch (err) {
      console.error('Error persisting backend db:', err);
    }
  }

  collection(name) {
    if (mongoDbInstance) {
      return mongoDbInstance.collection(name);
    }

    return {
      find: (query) => {
        let items = [...(this.data[name] || [])];
        if (query) {
          items = items.filter((item) => {
            for (const key of Object.keys(query)) {
              if (item[key] !== query[key]) return false;
            }
            return true;
          });
        }
        return {
          toArray: async () => items,
          limit: (n) => ({ toArray: async () => items.slice(0, n) }),
        };
      },
      findOne: async (query) => {
        const items = this.data[name] || [];
        return (
          items.find((item) => {
            for (const key of Object.keys(query)) {
              if (item[key] !== query[key]) return false;
            }
            return true;
          }) || null
        );
      },
      insertOne: async (doc) => {
        if (!this.data[name]) this.data[name] = [];
        this.data[name].push(doc);
        this.persist();
        return { acknowledged: true, insertedId: doc.id || doc._id };
      },
      updateOne: async (query, update) => {
        const items = this.data[name] || [];
        const index = items.findIndex((item) => {
          for (const key of Object.keys(query)) {
            if (item[key] !== query[key]) return false;
          }
          return true;
        });
        if (index === -1) return { matchedCount: 0, modifiedCount: 0 };
        this.data[name][index] = { ...this.data[name][index], ...update.$set };
        this.persist();
        return { matchedCount: 1, modifiedCount: 1 };
      },
      deleteOne: async (query) => {
        const prevLen = (this.data[name] || []).length;
        this.data[name] = (this.data[name] || []).filter((item) => {
          for (const key of Object.keys(query)) {
            if (item[key] === query[key]) return false;
          }
          return true;
        });
        this.persist();
        return { acknowledged: true, deletedCount: prevLen - this.data[name].length };
      },
    };
  }
}

export const db = new BackendDatabase();
export { MongoClient, ObjectId, ServerApiVersion };
export default db;
