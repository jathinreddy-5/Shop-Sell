import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface VerifiedFirebaseUser {
  uid: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
}

@Injectable()
export class FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);
  private initialized = false;

  constructor() {
    this.initFirebaseAdmin();
  }

  private initFirebaseAdmin() {
    if (getApps().length > 0) {
      this.initialized = true;
      return;
    }

    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'shopsell-176ab';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    try {
      if (projectId && clientEmail && rawPrivateKey) {
        const privateKey = rawPrivateKey.includes('\\n')
          ? rawPrivateKey.replace(/\\n/g, '\n')
          : rawPrivateKey;

        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.initialized = true;
        this.logger.log(`Firebase Admin initialized with service account for project: ${projectId}`);
      } else if (projectId) {
        initializeApp({ projectId });
        this.initialized = true;
        this.logger.log(`Firebase Admin initialized with project ID: ${projectId}`);
      } else {
        initializeApp();
        this.initialized = true;
        this.logger.log('Firebase Admin initialized with default credentials');
      }
    } catch (err: any) {
      this.logger.warn(`Firebase Admin initialization note: ${err?.message || err}`);
    }
  }

  /**
   * Cryptographically verifies a Firebase ID Token using Firebase Admin SDK.
   * Never trusts client-submitted phone numbers or UIDs.
   */
  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
    if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
      throw new UnauthorizedException('Firebase ID token is required');
    }

    const trimmedToken = idToken.trim();

    // Deterministic test-token support strictly in non-production environments
    if (process.env.NODE_ENV !== 'production' && trimmedToken.startsWith('mock-firebase-token-')) {
      const parts = trimmedToken.split(':');
      let uid = 'mock-firebase-uid-1';
      let phoneNumber: string | undefined = undefined;
      let email: string | undefined = undefined;
      let name: string | undefined = undefined;

      if (parts[1]?.includes('@')) {
        email = parts[1];
        uid = `google-${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        name = parts[2] || 'Google User';
      } else {
        phoneNumber = '+919876543210';
        if (parts.length >= 3) {
          uid = parts[1] || uid;
          phoneNumber = parts[2] || phoneNumber;
        } else if (parts.length === 2) {
          if (parts[1].startsWith('+') || /^\d+$/.test(parts[1])) {
            phoneNumber = parts[1];
            uid = `uid-${phoneNumber.replace(/\+/g, '')}`;
          } else {
            uid = parts[1];
          }
        }
        email = `${phoneNumber.replace('+', '')}@phone.shopsell.dev`;
      }

      return {
        uid,
        phoneNumber,
        email,
        name,
      };
    }

    try {
      if (!getApps().length) {
        this.initFirebaseAdmin();
      }

      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(trimmedToken, true);

      if (!decodedToken || !decodedToken.uid) {
        throw new UnauthorizedException('Invalid Firebase authentication token');
      }

      return {
        uid: decodedToken.uid,
        phoneNumber: decodedToken.phone_number,
        email: decodedToken.email,
        name: decodedToken.name,
      };
    } catch (err: any) {
      this.logger.warn(`Firebase ID token verification failed: ${err?.message || err}`);
      throw new UnauthorizedException('Invalid or expired Firebase authentication token');
    }
  }
}
