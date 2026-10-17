import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Permission } from '../permissions/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';

/**
 * Script to reset all user passwords to '123456'
 * 
 * Usage: npx ts-node src/seeds/reset-passwords.ts
 */

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'example_project_nestjs',
  dateStrings: true,
  entities: [User, Permission, Role],
  synchronize: true,
});

async function resetPasswords() {
  console.log('🔄 Connecting to database...');
  await dataSource.initialize();
  console.log('✅ Connected.');

  const userRepository = dataSource.getRepository(User);
  const users = await userRepository.find();

  if (users.length === 0) {
    console.log('⚠️ No users found in database.');
    await dataSource.destroy();
    return;
  }

  console.log(`🔍 Found ${users.length} users. Generating hash for "123456"...`);
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash('123456', salt);

  console.log('⚙️ Updating passwords...');
  for (const user of users) {
    user.password = hashedPassword;
    await userRepository.save(user);
    console.log(`✅ Updated password for user: ${user.username}`);
  }

  console.log('\n🎉 All passwords have been reset to "123456"');
  await dataSource.destroy();
}

resetPasswords().catch((error) => {
  console.error('❌ Reset failed:', error);
  process.exit(1);
});
