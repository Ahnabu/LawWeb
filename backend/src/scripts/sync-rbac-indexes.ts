import '../config/env';
import dns from 'dns';
import mongoose from 'mongoose';
import User from '../models/User';
import Role from '../models/Role';
import StaffAssignment from '../models/StaffAssignment';
import AuditLog from '../models/AuditLog';

// Builds the indexes the role-based access feature relies on. Safe to run repeatedly.
// createIndexes() only adds what is missing; unlike syncIndexes() it never drops an
// index the schema doesn't declare, so it can't remove one added by hand on Atlas.

// Same resolver workaround as server.ts: local DNS refuses the Atlas SRV lookup.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MODELS = [Role, StaffAssignment, User, AuditLog] as const;

async function syncRbacIndexes() {
  await mongoose.connect(process.env.MONGODB_URI!);
  for (const model of MODELS) {
    await model.createIndexes();
    const names = (await model.collection.indexes()).map((index) => index.name).join(', ');
    console.log(`${model.modelName}: ${names}`);
  }
}

syncRbacIndexes()
  .catch((error) => {
    console.error('Failed to sync indexes:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
