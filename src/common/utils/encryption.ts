import crypto from "node:crypto";
import { ENVIRONMENT } from "../config";

/**
 * Helper function to ensure the key and IV have the correct length
 * @param {string} value - The key or IV string
 * @param {number} length - Required length in bytes
 * @returns {Buffer} - Buffer of correct length
 */
function normalizeKeyOrIV(value: string, length: number) {
  // Convert string to Buffer
  const buffer = Buffer.from(value, "utf8");

  // If it's already the correct length, return it
  if (buffer.length === length) {
    return buffer;
  }

  // If it's too short, pad it with zeros
  if (buffer.length < length) {
    const result = Buffer.alloc(length, 0);
    buffer.copy(result);
    return result;
  }

  // If it's too long, truncate it
  return buffer.subarray(0, length);
}

/**
 * Encrypts data using AES-CTR mode
 * @param {string} data - The data to encrypt
 * @returns {string} - The encrypted data as a string
 */
export function encryptData(data: string) {
  try {
    // Convert data to string if it's not already
    const stringData = typeof data === "string" ? data : JSON.stringify(data);

    const encryptKey = ENVIRONMENT.APP.ENCRYPT as string;
    const encryptIV = ENVIRONMENT.APP.ENCRYPT_IV as string;

    // Normalize key and IV to correct lengths for AES-256-CTR
    const key = normalizeKeyOrIV(encryptKey, 32); // 256 bits = 32 bytes
    const iv = normalizeKeyOrIV(encryptIV, 16); // 128 bits = 16 bytes

    // Create cipher using CTR mode
    const cipher = crypto.createCipheriv("aes-256-ctr", key, iv);

    // Encrypt the data
    let encrypted = cipher.update(stringData, "utf8", "base64");
    encrypted += cipher.final("base64");

    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error(`Failed to encrypt data: ${data}`);
  }
}

const BASE64_REGEX =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Decrypts a value only if it looks like ciphertext, otherwise returns it as-is.
 * CTR mode is unauthenticated, so "is this encrypted?" can't be answered directly:
 * we require strict base64, then keep the decryption only if it yields printable
 * text — plaintext run through the decipher produces garbage bytes and falls back.
 */
export function safeDecryptData(value: string) {
  if (!value || value.length % 4 !== 0 || !BASE64_REGEX.test(value)) {
    return value;
  }

  try {
    const decrypted = decryptData(value);
    return /^[\x20-\x7E]+$/.test(decrypted) ? decrypted : value;
  } catch {
    return value;
  }
}

/**
 * Decrypts data that was encrypted with encryptData
 * @param {string} encryptedData - The encrypted data string
 * @returns {string} - The decrypted data as a string
 */
export function decryptData(encryptedData: string) {
  try {
    if (!encryptedData) {
      return "";
    }

    const encryptKey = ENVIRONMENT.APP.ENCRYPT as string;
    const encryptIV = ENVIRONMENT.APP.ENCRYPT_IV as string;

    // Normalize key and IV to correct lengths
    const key = normalizeKeyOrIV(encryptKey, 32);
    const iv = normalizeKeyOrIV(encryptIV, 16);

    // Create decipher
    const decipher = crypto.createDecipheriv("aes-256-ctr", key, iv);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error("Failed to decrypt data");
  }
}
