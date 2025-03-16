import crypto from 'crypto';

// Encryption algorithm
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.JWT_SECRET || 'harshith1234'; // Using existing JWT secret as encryption key

// Function to encrypt data
export const encryptData = (data) => {
  try {
    // Convert data to string if it's not already
    const dataString = prepareDataForEncryption(data);
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create key buffer from SECRET_KEY
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
    
    // Create cipher with key and iv
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

// Function to decrypt data
export const decryptData = (encryptedData, iv) => {
  try {
    // Create key buffer from SECRET_KEY
    const key = crypto.scryptSync(SECRET_KEY, 'salt', 32);
    
    // Convert IV from hex to Buffer
    const ivBuffer = Buffer.from(iv, 'hex');
    
    // Create decipher with key and iv
    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse JSON if the decrypted result is a JSON string
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      return decrypted;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Add this export function to ensure proper stringification of objects

/**
 * Ensures that data is properly stringified before encryption
 * @param {any} data - Data to be encrypted
 * @returns {string} - Stringified data
 */
export const prepareDataForEncryption = (data) => {
  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data);
  }
  return String(data);
};
