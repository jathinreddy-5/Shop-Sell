/**
 * Shop:Sell Privacy-Preserving Analytics Emitter
 * Compliant with DPDP Act & GDPR: Never records PII values (names, phones, emails).
 */

export type AnalyticsEventType =
  | 'onboarding_modal_viewed'
  | 'step_viewed'
  | 'step_completed'
  | 'step_skipped'
  | 'field_completed'
  | 'field_error'
  | 'otp_sent'
  | 'otp_verified'
  | 'onboarding_completed'
  | 'onboarding_dismissed'
  | 'contextual_prompt_shown'
  | 'contextual_prompt_accepted'
  | 'contextual_prompt_dismissed'
  | 'waitlist_joined';

export interface AnalyticsEventPayload {
  step?: 1 | 2;
  fieldName?: string;
  errorType?: string;
  durationMs?: number;
  interestsCount?: number;
  shoppingFor?: string;
  hasPincode?: boolean;
  isServiceable?: boolean;
  marketingConsent?: boolean;
}

export function emitAnalyticsEvent(
  eventType: AnalyticsEventType,
  payload: AnalyticsEventPayload = {}
): void {
  const timestamp = new Date().toISOString();
  const event = {
    event: eventType,
    timestamp,
    ...payload,
  };

  // Safe developer logging & forward to user event pipeline
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[Analytics] 📊 ${eventType}`, event);
  }

  try {
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push(event);
    }
  } catch {}
}
