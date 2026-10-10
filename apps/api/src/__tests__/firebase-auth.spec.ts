import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as jwt from 'jsonwebtoken';
import { FirebaseAuthService } from '../modules/auth/firebase-auth.service';
import { AuthService } from '../modules/auth/auth.service';
import { SmsService } from '../modules/auth/sms.service';
import { EmailService } from '../modules/auth/email.service';
import { DatabaseService } from '../database/database.service';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'valid-super-secure-jwt-secret-string-min-32-chars-ok';
process.env.INTERNAL_API_SECRET = 'valid-super-secure-proxy-secret-string-min-32-chars-ok';

describe('Firebase Phone Authentication Suite (apps/api)', () => {
  const firebaseAuthService = new FirebaseAuthService();

  it('should reject missing or empty Firebase ID token', async () => {
    await assert.rejects(
      async () => firebaseAuthService.verifyIdToken(''),
      (err: any) => err.status === 401 && err.message.includes('required')
    );

    await assert.rejects(
      async () => firebaseAuthService.verifyIdToken('   '),
      (err: any) => err.status === 401
    );
  });

  it('should parse deterministic test token format in non-production environments', async () => {
    const verified = await firebaseAuthService.verifyIdToken(
      'mock-firebase-token-test-uid:+919876543210'
    );

    assert.strictEqual(verified.phoneNumber, '+919876543210');
    assert.ok(verified.uid);
    assert.strictEqual(verified.email, '919876543210@phone.shopsell.dev');
  });

  it('should complete full AuthService.loginWithFirebase flow: user lookup, profile creation, and Shop:Sell JWT issuance', async () => {
    // Mock DatabaseService
    const mockUsers: any[] = [];
    const mockProfiles: any[] = [];

    const mockDb = {
      async query(sql: string, params: any[] = []) {
        if (sql.includes('SELECT u.id, u.email, u.phone')) {
          const [uid, phone] = params;
          const found = mockProfiles.find(
            (p) => p.firebase_uid === uid || p.phone === phone
          );
          if (found) {
            const user = mockUsers.find((u) => u.id === found.id);
            return {
              rows: [
                {
                  id: user.id,
                  email: user.email,
                  phone: user.phone,
                  raw_user_meta_data: user.raw_user_meta_data,
                  firebase_uid: found.firebase_uid,
                  roles: found.roles,
                  full_name: found.full_name,
                },
              ],
            };
          }
          return { rows: [] };
        }

        if (sql.includes('INSERT INTO auth.users')) {
          const [id, email, phone, metadataJson] = params;
          mockUsers.push({
            id,
            email,
            phone,
            raw_user_meta_data: JSON.parse(metadataJson),
          });
          return { rows: [] };
        }

        if (sql.includes('INSERT INTO public.profiles')) {
          const [id, fullName, phone, firebaseUid] = params;
          mockProfiles.push({
            id,
            full_name: fullName,
            phone,
            firebase_uid: firebaseUid,
            roles: ['customer'],
          });
          return { rows: [] };
        }

        if (sql.includes('UPDATE auth.users SET last_sign_in_at')) {
          return { rows: [] };
        }

        if (sql.includes('UPDATE public.profiles SET firebase_uid')) {
          return { rows: [] };
        }

        return { rows: [] };
      },
    } as unknown as DatabaseService;

    const smsService = new SmsService();
    const emailService = new EmailService();
    const authService = new AuthService(mockDb, smsService, emailService, firebaseAuthService);

    const testToken = 'mock-firebase-token-uid-abc:+919876543210';
    const result = await authService.loginWithFirebase(testToken);

    // 1. JWT validation
    assert.ok(result.token, 'Expected JWT token to be generated');
    const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-minimum-32-characters-long';
    const decoded = jwt.verify(result.token, secret) as any;

    assert.strictEqual(decoded.phone, '+919876543210');
    assert.deepStrictEqual(decoded.app_metadata.roles, ['customer']);
    assert.deepStrictEqual(result.roles, ['customer']);
    assert.strictEqual(decoded.app_metadata.provider, 'firebase_phone');

    // 2. User & profile created in mock database
    assert.strictEqual(mockUsers.length, 1);
    assert.strictEqual(mockProfiles.length, 1);
    assert.strictEqual(mockProfiles[0].phone, '+919876543210');

    // 3. Second login for existing user preserves roles
    mockProfiles[0].roles = ['owner', 'customer']; // Grant seller role
    const secondResult = await authService.loginWithFirebase(testToken);

    assert.deepStrictEqual(secondResult.roles, ['owner', 'customer']);
    assert.strictEqual(mockUsers.length, 1, 'No duplicate user created');
  });
});
