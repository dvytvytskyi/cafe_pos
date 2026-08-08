import {
  validateProfileEmail,
  validateProfileName,
  validateNewPassword,
  joinProfileName,
  splitProfileName,
  PASSWORD_COMPLEXITY_REGEX,
  ProfileValidationError,
} from './profile-validation.ts';
import { hashPassword, verifyPassword } from './profile-password.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export async function run() {
  console.log('--- Module 24 Profile Unit Tests ---');

  assert(validateProfileName('Anna') === 'Anna', 'name trim');
  try {
    validateProfileName('');
    throw new Error('empty name should fail');
  } catch (e) {
    assert(e instanceof ProfileValidationError, 'empty name throws ProfileValidationError');
  }
  console.log('✅ T24.1 name required');

  assert(PASSWORD_COMPLEXITY_REGEX.test('Secure1!'), 'strong password accepted');
  assert(!PASSWORD_COMPLEXITY_REGEX.test('short1!'), 'short password rejected');
  assert(!PASSWORD_COMPLEXITY_REGEX.test('nouppercase1!'), 'missing upper rejected');
  try {
    validateNewPassword('weak');
    throw new Error('weak password should fail');
  } catch (e) {
    assert(e instanceof ProfileValidationError, 'weak password throws');
  }
  console.log('✅ T24.1 password complexity');

  assert(validateProfileEmail('Test.Name+tag@example.com') === 'test.name+tag@example.com', 'email normalized');
  try {
    validateProfileEmail('bad-email');
    throw new Error('bad email should fail');
  } catch (e) {
    assert(e instanceof ProfileValidationError, 'bad email throws');
  }
  console.log('✅ T24.1 email RFC regex');

  const hash = hashPassword('Secure1!');
  assert(verifyPassword('Secure1!', hash), 'password verify success');
  assert(!verifyPassword('WrongPass1!', hash), 'password verify failure');
  console.log('✅ T24.1 password hash verify');

  assert(joinProfileName('John', 'Doe') === 'John Doe', 'join names');
  assert(splitProfileName('John Doe').firstName === 'John', 'split first');
  assert(splitProfileName('John Doe').lastName === 'Doe', 'split last');

  console.log('✅ Module 24 profile unit tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
