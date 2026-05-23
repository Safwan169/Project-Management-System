import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { UserRole } from '../types';

const TEST_PASSWORD = 'pass1234!';

const seedUsers: { name: string; email: string; role: UserRole }[] = [
  { name: 'Admin User', email: 'admin@gmail.com', role: 'admin' },
  { name: 'Manager User', email: 'manager@gmail.com', role: 'manager' },
  { name: 'Member User', email: 'member@gmail.com', role: 'member' },
];

async function seed(): Promise<void> {
  await connectDB();

  for (const { name, email, role } of seedUsers) {
    // Skip if already present so re-running the seeder is safe.
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`[seed] ${email} already exists — skipped`);
      continue;
    }

    // password goes through the model hook and is hashed.
    await User.create({ name, email, password: TEST_PASSWORD, role });
    console.log(`[seed] created ${email} (${role})`);
  }

  console.log(`[seed] Done. All test users use the password: ${TEST_PASSWORD}`);
}

seed()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[seed] Failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState === 1) {
      await disconnectDB();
    }
  });
