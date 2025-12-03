/**
 * Encryption utilities for storing sensitive credentials
 *
 * Uses AES-256-GCM for encrypting integration credentials before storing in database
 *
 * IMPORTANT: For production use, consider:
 * - Supabase Vault (https://supabase.com/docs/guides/database/vault)
 * - AWS KMS, Google Cloud KMS, or Azure Key Vault
 * - Hardware Security Modules (HSM)
 *
 * This implementation is suitable for personal projects but should be hardened for production.
 */

import crypto from 'crypto'

// Encryption key - MUST be 32 bytes (256 bits) for AES-256
// In production, store this in a secure vault, not in env vars
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')

if (!process.env.ENCRYPTION_KEY) {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in environment. Using temporary key.')
  console.warn('⚠️  Set ENCRYPTION_KEY in .env.local for persistent encryption.')
}

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits authentication tag

/**
 * Encrypt a string value
 * Returns base64-encoded encrypted data with IV and auth tag prepended
 */
export function encrypt(plaintext: string): string {
  try {
    // Generate random IV for each encryption (never reuse IVs!)
    const iv = crypto.randomBytes(IV_LENGTH)

    // Convert hex key to buffer
    const key = Buffer.from(ENCRYPTION_KEY, 'hex')

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ])

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    // Combine: IV + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted])

    // Return as base64
    return combined.toString('base64')
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt an encrypted string
 * Expects base64-encoded data with IV and auth tag prepended
 */
export function decrypt(ciphertext: string): string {
  try {
    // Decode from base64
    const combined = Buffer.from(ciphertext, 'base64')

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    // Convert hex key to buffer
    const key = Buffer.from(ENCRYPTION_KEY, 'hex')

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])

    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Encrypt an object (converts to JSON first)
 */
export function encryptObject<T>(obj: T): string {
  return encrypt(JSON.stringify(obj))
}

/**
 * Decrypt to an object (parses JSON after decryption)
 */
export function decryptObject<T>(ciphertext: string): T {
  const decrypted = decrypt(ciphertext)
  return JSON.parse(decrypted) as T
}

/**
 * Generate a new encryption key (for initial setup)
 * Run this once and store the output in your .env.local
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a string (for non-reversible hashing, like tokens)
 */
export function hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

// Example usage for credentials:
export interface GoogleKeepCredentials {
  email: string
  password?: string
  masterToken?: string
}

/**
 * Encrypt Google Keep credentials for storage
 */
export function encryptKeepCredentials(credentials: GoogleKeepCredentials): string {
  return encryptObject(credentials)
}

/**
 * Decrypt Google Keep credentials from storage
 */
export function decryptKeepCredentials(encrypted: string): GoogleKeepCredentials {
  return decryptObject<GoogleKeepCredentials>(encrypted)
}
