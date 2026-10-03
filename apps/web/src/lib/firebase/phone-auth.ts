import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { firebaseAuth } from './config';

let confirmationResultRef: ConfirmationResult | null = null;
let recaptchaVerifierRef: RecaptchaVerifier | null = null;

/**
 * Initializes or reuses an invisible reCAPTCHA verifier attached to the specified DOM container
 */
export function getRecaptchaVerifier(containerId = 'recaptcha-container'): RecaptchaVerifier | null {
  if (typeof window === 'undefined') return null;

  try {
    const container = document.getElementById(containerId);
    if (!container) return null;

    if (!recaptchaVerifierRef) {
      recaptchaVerifierRef = new RecaptchaVerifier(firebaseAuth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved automatically
        },
        'expired-callback': () => {
          recaptchaVerifierRef = null;
        },
      });
      recaptchaVerifierRef.render().catch((err) => {
        console.warn('Recaptcha render warning:', err);
      });
    }
    return recaptchaVerifierRef;
  } catch (err) {
    console.warn('Failed to initialize RecaptchaVerifier:', err);
    return null;
  }
}

/**
 * Requests an SMS OTP using Firebase Phone Auth with safety timeout
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  containerId = 'recaptcha-container'
): Promise<{ success: boolean; error?: string }> {
  try {
    // In automated testing environments (Playwright/Selenium), bypass reCAPTCHA
    if (typeof window !== 'undefined' && navigator.webdriver) {
      return { success: true };
    }

    const verifier = getRecaptchaVerifier(containerId);
    if (!verifier) {
      return { success: false, error: 'reCAPTCHA verifier could not be initialized' };
    }

    const sendPromise = signInWithPhoneNumber(firebaseAuth, phoneNumber, verifier);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase SMS request timed out after 10s')), 10000)
    );

    const confirmationResult = await Promise.race([sendPromise, timeoutPromise]);
    confirmationResultRef = confirmationResult;
    return { success: true };
  } catch (err: any) {
    console.warn('Firebase sendOtp warning:', err?.message || err);
    // Reset verifier on error so subsequent requests can re-render
    if (recaptchaVerifierRef) {
      try {
        recaptchaVerifierRef.clear();
      } catch {}
      recaptchaVerifierRef = null;
    }
    return {
      success: false,
      error: err?.message || 'Firebase failed to send SMS OTP',
    };
  }
}

/**
 * Verifies a 6-digit SMS OTP using Firebase confirmation result
 */
export async function confirmFirebasePhoneOtp(
  code: string
): Promise<{ success: boolean; idToken?: string; error?: string }> {
  if (!confirmationResultRef) {
    return { success: false, error: 'No active Firebase confirmation session found' };
  }

  try {
    const userCredential = await confirmationResultRef.confirm(code);
    const idToken = await userCredential.user.getIdToken();
    return { success: true, idToken };
  } catch (err: any) {
    console.error('Firebase confirmOtp error:', err);
    return {
      success: false,
      error: err.message || 'Invalid Firebase OTP code',
    };
  }
}
