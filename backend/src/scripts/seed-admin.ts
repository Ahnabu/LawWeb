import '../config/env';
import dns from 'dns';
import mongoose from 'mongoose';
import User from '../models/User';

// Creates (or promotes/resets) the admin account. Safe to run repeatedly.
// Override the defaults with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME.
const email = (process.env.SEED_ADMIN_EMAIL || 'admin@lawweb.com').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
const name = process.env.SEED_ADMIN_NAME || 'Admin';

// Same resolver workaround as server.ts: local DNS refuses the Atlas SRV lookup.
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function seedAdmin() {
  await mongoose.connect(process.env.MONGODB_URI!);

  let user = await User.findOne({ email }).select('+password');
  const created = !user;
  if (!user) user = new User({ email, name });

  user.role = 'admin';
  user.isVerified = true;
  user.passwordNeedsChange = false;
  user.password = password; // hashed by the pre-save hook
  await user.save();

  console.log(`${created ? 'Created' : 'Updated'} admin: ${email}`);
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to seed admin:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
