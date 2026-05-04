import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';

dotenv.config();

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'lawyer';
  barId?: string;
  phone?: string;
  isVerified: boolean;
};

const seedUsers: SeedUser[] = [
  {
    name: 'Admin User',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@lawweb.com',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    role: 'admin',
    phone: process.env.SEED_ADMIN_PHONE || '+8801700000001',
    isVerified: true,
  },
  {
    name: 'Nazrul Islam',
    email: process.env.SEED_LAWYER_EMAIL || 'nazrul@lawweb.com',
    password: process.env.SEED_LAWYER_PASSWORD || 'Lawyer@12345',
    role: 'lawyer',
    barId: process.env.SEED_LAWYER_BAR_ID || 'BC-1387',
    phone: process.env.SEED_LAWYER_PHONE || '+8801700000002',
    isVerified: true,
  },
];

async function seed() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from the environment');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    for (const seedUser of seedUsers) {
      const existingUser = await User.findOne({ email: seedUser.email }).select('+password');

      if (existingUser) {
        existingUser.name = seedUser.name;
        existingUser.password = seedUser.password;
        existingUser.role = seedUser.role;
        existingUser.barId = seedUser.barId;
        existingUser.phone = seedUser.phone;
        existingUser.isVerified = seedUser.isVerified;
        await existingUser.save();
        continue;
      }

      const user = new User({
        name: seedUser.name,
        email: seedUser.email,
        password: seedUser.password,
        role: seedUser.role,
        barId: seedUser.barId,
        phone: seedUser.phone,
        isVerified: seedUser.isVerified,
      });

      await user.save();
    }

    console.log(`Seeded ${seedUsers.length} users successfully`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();