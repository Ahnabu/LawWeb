import '../config/env';
import crypto from 'crypto';
import dns from 'dns';
import mongoose from 'mongoose';
import User from '../models/User';
import { sendAccountSetupLink } from '../controllers/authController';
import { revokeAllSessions } from '../utils/session';

// One-off migration. Lawyers added before the setup-link flow were created with
// the shared password "123456" and passwordNeedsChange=true. Anyone who knows
// such a lawyer's email could still log in with it. This replaces each of those
// passwords with a random one and emails the lawyer a link to set their own.
//
//   npm run migrate:temp-passwords            -> dry run, lists affected accounts
//   npm run migrate:temp-passwords -- --apply -> makes the change and sends emails

dns.setServers(['8.8.8.8', '8.8.4.4']);

async function main() {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI!);

  const users = await User.find({ passwordNeedsChange: true }).select('+password');
  console.log(`${users.length} account(s) still on a temporary password${apply ? '' : ' (dry run, pass --apply to change them)'}`);

  for (const user of users) {
    console.log(`- ${user.email} (${user.role})`);
    if (!apply) continue;

    user.password = crypto.randomBytes(32).toString('hex');
    user.passwordNeedsChange = false;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    await revokeAllSessions(user.id);

    try {
      await sendAccountSetupLink(user);
      console.log('  setup link sent');
    } catch (error) {
      console.error('  email failed; the user can use "Forgot password":', (error as Error).message);
    }
  }
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
