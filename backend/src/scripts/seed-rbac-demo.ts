import '../config/env';
import dns from 'dns';
import mongoose from 'mongoose';
import User from '../models/User';
import LawyerProfile from '../models/LawyerProfile';
import LawyerAvailability from '../models/LawyerAvailability';
import StaffAssignment from '../models/StaffAssignment';
import Case from '../models/Case';
import Consultation from '../models/Consultation';

// Demo accounts for trying role-based access and for frontend/e2e/rbac.spec.ts.
// Development and test databases only: refuses to run when NODE_ENV=production.
//
//   npm run seed:rbac-demo                          create or reset the demo accounts and data
//   npm run seed:rbac-demo -- --set-password <email> give that staff/lawyer/client the demo password
//                                                   (the e2e spec uses it for staff it creates in the UI,
//                                                   whose setup link only arrives by email)
//   npm run seed:rbac-demo -- --clean               remove the demo accounts and their data
//
// The password is RBAC_DEMO_PASSWORD, or Demo@12345.

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo accounts in production.');
  process.exit(1);
}

const PASSWORD = process.env.RBAC_DEMO_PASSWORD || 'Demo@12345';
const DEMO = {
  lawyer: { email: 'rbac-demo-lawyer@example.com', name: 'RBAC-DEMO Lawyer', role: 'lawyer' },
  client: { email: 'rbac-demo-client@example.com', name: 'RBAC-DEMO Client', role: 'client' },
  assistant: { email: 'rbac-demo-assistant@example.com', name: 'RBAC-DEMO Assistant', role: 'staff' },
} as const;

// Same resolver workaround as server.ts: local DNS refuses the Atlas SRV lookup.
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Creates the account, or resets it to a usable state; existing sessions end
async function upsertAccount({ email, name, role }: { email: string; name: string; role: string }) {
  let user = await User.findOne({ email }).select('+password');
  if (user && user.role !== role) throw new Error(`${email} already exists as a ${user.role}`);
  if (!user) user = new User({ email });
  Object.assign(user, {
    name,
    role,
    password: PASSWORD, // hashed by the pre-save hook
    isVerified: true,
    passwordNeedsChange: false,
    isBlocked: false,
    blockedAt: undefined,
    blockedReason: undefined,
    deletedAt: null,
    deletedBy: null,
    deletionPending: undefined,
    tokenVersion: (user.tokenVersion ?? 0) + 1,
    ...(role === 'lawyer' ? { barId: 'BC-RBAC-DEMO', phone: '+8801700000000', specialization: 'Civil Law' } : {}),
    ...(role === 'staff' ? { staffRoleId: null } : {}),
  });
  await user.save();
  return user;
}

// `days` from today, as UTC midnight (how bookings store dates)
function daysAhead(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function removeDemoData(lawyerId?: unknown, staffId?: unknown) {
  if (lawyerId) {
    await Promise.all([
      Case.deleteMany({ lawyerId }),
      Consultation.deleteMany({ lawyerId }),
      StaffAssignment.deleteMany({ lawyerId }),
    ]);
  }
  if (staffId) await StaffAssignment.deleteMany({ staffId });
}

async function seed() {
  const lawyer = await upsertAccount(DEMO.lawyer);
  const client = await upsertAccount(DEMO.client);
  const assistant = await upsertAccount(DEMO.assistant);
  await removeDemoData(lawyer._id, assistant._id);

  await LawyerProfile.findOneAndUpdate(
    { userId: lawyer._id },
    { $set: { firstName: 'RBAC-DEMO', lastName: 'Lawyer', designation: { en: 'Advocate', bn: '' }, isActive: true } },
    { upsert: true }
  );
  // Every day open, so a booking can always find a slot
  const openDay = { isAvailable: true, startTime: '09:00', endTime: '17:00' };
  await LawyerAvailability.findOneAndUpdate(
    { lawyerId: lawyer._id },
    {
      $set: {
        isAcceptingNewClients: true,
        schedule: Object.fromEntries(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d) => [d, openDay])),
      },
    },
    { upsert: true }
  );

  const demoCase = await Case.create({
    clientId: client._id,
    clientEmail: client.email,
    clientName: client.name,
    lawyerId: lawyer._id,
    type: 'civil',
    title: 'RBAC-DEMO Case',
    description: '<p>Demo case for trying role-based access.</p>',
    caseValue: 500000,
    retainerAmount: 50000,
    totalPayment: 100000,
    payments: [{ amount: 25000, details: 'First instalment' }],
    internalNotes: 'Demo confidential note',
    evidenceSummary: 'Demo evidence summary',
  });
  const booking = await Consultation.create({
    clientId: client._id,
    lawyerId: lawyer._id,
    consultationType: 'initial-consultation',
    date: daysAhead(14),
    time: '10:00 AM',
    subject: 'RBAC-DEMO Booking',
    description: 'Demo booking for an assistant to confirm.',
    status: 'scheduled',
    lawyerConfirmed: false,
  });

  console.log('RBAC demo data ready (password for every account below: the demo password)');
  console.log(`  lawyer     ${lawyer.email}`);
  console.log(`  client     ${client.email}`);
  console.log(`  assistant  ${assistant.email} (staff, no firm role, no delegations)`);
  console.log(`  case       ${demoCase.caseNumber} "${demoCase.title}"`);
  console.log(`  booking    ${booking.date.toISOString().slice(0, 10)} ${booking.time} "${booking.subject}"`);
}

async function setPassword(email: string) {
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  if (!user) throw new Error(`No account with email ${email}`);
  if (user.role === 'admin') throw new Error('Refusing to change the super-admin password; use seed:admin');
  user.password = PASSWORD;
  user.isVerified = true;
  user.passwordNeedsChange = false;
  await user.save();
  console.log(`Password set for ${user.email} (${user.role})`);
}

async function clean() {
  const users = await User.find({ email: { $in: Object.values(DEMO).map((a) => a.email) } }).select('_id role');
  for (const user of users) {
    await removeDemoData(user.role === 'lawyer' ? user._id : undefined, user.role === 'staff' ? user._id : undefined);
    if (user.role === 'lawyer') {
      await Promise.all([LawyerProfile.deleteOne({ userId: user._id }), LawyerAvailability.deleteOne({ lawyerId: user._id })]);
    }
    if (user.role === 'client') {
      await Promise.all([Case.updateMany({ clientId: user._id }, { $set: { clientId: null } }), Consultation.deleteMany({ clientId: user._id })]);
    }
  }
  await User.deleteMany({ _id: { $in: users.map((u) => u._id) } });
  console.log(`Removed ${users.length} demo account(s) and their data`);
}

async function main() {
  const args = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI!);
  const at = args.indexOf('--set-password');
  if (at !== -1) {
    if (!args[at + 1]) throw new Error('--set-password needs an email');
    await setPassword(args[at + 1]);
  } else if (args.includes('--clean')) {
    await clean();
  } else {
    await seed();
  }
}

main()
  .catch((error) => {
    console.error('RBAC demo seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
