import { getUberAccessToken } from './apps/web/src/lib/uber/auth';
import dotenv from 'dotenv';

dotenv.config();

async function testAuth() {
  console.log('Testing Uber API Authentication...');
  try {
    const token = await getUberAccessToken();
    console.log('✅ SUCCESS! Got access token:', token.substring(0, 10) + '...');
  } catch (error) {
    console.error('❌ FAILED to get access token:');
    console.error(error);
  }
}

testAuth();
