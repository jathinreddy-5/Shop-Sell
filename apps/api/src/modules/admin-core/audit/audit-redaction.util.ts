/**
 * Audit Redaction Utility
 * Security Invariant: Never allow raw PAN, bank account numbers, passwords,
 * tokens, or sensitive personal data to enter audit logs, trace JSON, or error reports.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /api[-_]?key/i,
  /otp/i,
  /cvv/i,
  /private[-_]?key/i,
  /session[-_]?id/i,
];

export function maskPan(pan: string): string {
  if (!pan || pan.length < 5) return 'XXXXX';
  const clean = pan.trim().toUpperCase();
  return `XXXXX${clean.slice(-4)}`;
}

export function maskBankAccount(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return 'XXXX';
  const clean = accountNumber.trim();
  const visible = clean.slice(-4);
  return `${'X'.repeat(Math.max(4, clean.length - 4))}${visible}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return 'XXX-XXX';
  const clean = phone.trim();
  if (clean.length >= 10) {
    return `${clean.slice(0, 5)}*****${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 2)}***${clean.slice(-2)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  const [local, domain] = email.trim().split('@');
  if (local.length <= 2) {
    return `*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Deeply redacts an arbitrary payload object or array according to zero-leakage rules.
 */
export function sanitizeAuditPayload(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Check if string looks like an email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      return maskEmail(data);
    }
    // Check if string looks like Indian PAN (5 letters, 4 digits, 1 letter)
    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(data)) {
      return maskPan(data);
    }
    // Check if string looks like 9-18 digit bank account
    if (/^\d{9,18}$/.test(data)) {
      return maskBankAccount(data);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditPayload(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        sanitized[key] = '[REDACTED_SECRET]';
      } else if (key.toLowerCase().includes('pan')) {
        sanitized[key] = typeof value === 'string' ? maskPan(value) : '[REDACTED_PAN]';
      } else if (key.toLowerCase().includes('bank') || key.toLowerCase().includes('account_number')) {
        sanitized[key] = typeof value === 'string' ? maskBankAccount(value) : '[REDACTED_BANK]';
      } else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
        sanitized[key] = typeof value === 'string' ? maskPhone(value) : '[REDACTED_PHONE]';
      } else if (key.toLowerCase().includes('email')) {
        sanitized[key] = typeof value === 'string' ? maskEmail(value) : '[REDACTED_EMAIL]';
      } else {
        sanitized[key] = sanitizeAuditPayload(value);
      }
    }
    return sanitized;
  }

  return data;
}
