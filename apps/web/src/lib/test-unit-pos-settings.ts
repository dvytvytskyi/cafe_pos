import {
  isValidCurrency,
  isValidLanguage,
  validatePosSettingsPatch,
  PosSettingsValidationError,
} from './pos-settings-validation.ts';
import { formatPosAmount } from './pos-settings.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export async function run() {
  console.log('--- Module 25 POS Settings Unit Tests ---');

  assert(isValidCurrency('EUR') && isValidCurrency('USD'), 'ISO 4217 currency valid');
  assert(!isValidCurrency('XXX') && !isValidCurrency('EURO'), 'invalid currency rejected');
  console.log('✅ T25.1 ISO 4217 currency validation');

  assert(isValidLanguage('en') && isValidLanguage('es'), 'ISO 639-1 language valid');
  assert(!isValidLanguage('english') && !isValidLanguage('xx'), 'invalid language rejected');
  console.log('✅ T25.1 ISO 639-1 language validation');

  try {
    validatePosSettingsPatch({ unknownKey: true });
    throw new Error('unknown key should fail');
  } catch (e) {
    assert(e instanceof PosSettingsValidationError, 'unknown key throws');
  }
  console.log('✅ T25.1 unknown keys blocked');

  const patch = validatePosSettingsPatch({ currency: 'usd', language: 'ES' });
  assert(patch.currency === 'USD' && patch.language === 'es', 'normalizes codes');
  console.log('✅ T25.1 patch normalization');

  assert(formatPosAmount(4.3, 'EUR') === '€4.30', 'EUR format');
  assert(formatPosAmount(4.3, 'USD') === '$4.30', 'USD format');
  console.log('✅ formatPosAmount symbols');

  console.log('✅ Module 25 POS settings unit tests passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
