import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EncryptedField {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
}

export interface KmsEncryptionProvider {
  encrypt(plaintext: string): Promise<EncryptedField>;
  decrypt(field: EncryptedField): Promise<string>;
}

@Injectable()
export class KmsEncryptionService implements KmsEncryptionProvider {
  private readonly logger = new Logger(KmsEncryptionService.name);
  private readonly masterKey: Buffer;
  private readonly keyId: string;

  constructor() {
    // In production, master keys are obtained from AWS KMS / GCP Cloud KMS / Vault.
    // For local/dev, derive or retrieve master key securely from environment.
    const secret =
      process.env.ADMIN_KMS_MASTER_KEY ||
      'dev-shopsell-envelope-encryption-master-secret-256-bit-key!';
    this.masterKey = crypto.createHash('sha256').update(secret).digest();
    this.keyId = process.env.ADMIN_KMS_KEY_ID || 'local-kms-key-v1';
  }

  /**
   * Field-level envelope encryption using AES-256-GCM.
   */
  async encrypt(plaintext: string): Promise<EncryptedField> {
    const iv = crypto.randomBytes(12);
    // Generate a per-field Data Encryption Key (DEK)
    const dek = crypto.randomBytes(32);

    // Encrypt the plaintext with DEK
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag().toString('base64');

    // Encrypt DEK with Master Key (Envelope Encryption)
    const dekIv = crypto.randomBytes(12);
    const dekCipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, dekIv);
    let encryptedDek = dekCipher.update(dek.toString('base64'), 'utf8', 'base64');
    encryptedDek += dekCipher.final('base64');
    const dekTag = dekCipher.getAuthTag().toString('base64');

    // Package envelope
    const envelope = JSON.stringify({
      c: ciphertext,
      dek: encryptedDek,
      dekIv: dekIv.toString('base64'),
      dekTag,
    });

    return {
      ciphertext: Buffer.from(envelope).toString('base64'),
      iv: iv.toString('base64'),
      tag,
      keyId: this.keyId,
    };
  }

  /**
   * Field-level envelope decryption using AES-256-GCM.
   */
  async decrypt(field: EncryptedField): Promise<string> {
    try {
      const envelopeJson = Buffer.from(field.ciphertext, 'base64').toString('utf8');
      const envelope = JSON.parse(envelopeJson);

      // Decrypt DEK using Master Key
      const dekIv = Buffer.from(envelope.dekIv, 'base64');
      const dekDecipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, dekIv);
      dekDecipher.setAuthTag(Buffer.from(envelope.dekTag, 'base64'));
      let dekBase64 = dekDecipher.update(envelope.dek, 'base64', 'utf8');
      dekBase64 += dekDecipher.final('utf8');
      const dek = Buffer.from(dekBase64, 'base64');

      // Decrypt plaintext using DEK
      const iv = Buffer.from(field.iv, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
      decipher.setAuthTag(Buffer.from(field.tag, 'base64'));
      let decrypted = decipher.update(envelope.c, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err: any) {
      this.logger.error(`Field decryption failed: ${err.message}`);
      throw new Error('Field decryption failed or invalid ciphertext.');
    }
  }

  /**
   * Redacts sensitive PAN to only the last 4 characters.
   */
  maskPan(pan: string): string {
    if (!pan || pan.length < 4) return '••••';
    const last4 = pan.replace(/[\s-]/g, '').slice(-4);
    return `•••• •••• •••• ${last4}`;
  }

  /**
   * Redacts sensitive Bank Account numbers.
   */
  maskBankAccount(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) return '••••';
    const last4 = accountNumber.slice(-4);
    return `••••••••${last4}`;
  }
}
