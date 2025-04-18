// Simple encryption key - in production, this should be more secure
const ENCRYPTION_KEY = 'bastard-bench-encryption-key';
const DATA_MARKER = 'BB'; // Marker to identify our encrypted data

const isLegacyFormat = (encoded: string): boolean => {
  // Legacy format was just [CHECKSUM][ENCRYPTED]
  return encoded.length >= 4 && !encoded.startsWith(DATA_MARKER);
};

const decryptLegacy = (encoded: string): string => {
  try {
    if (!encoded || typeof encoded !== 'string' || encoded.length < 4) {
      return '';
    }

    // Extract and verify checksum
    const checksum = parseInt(encoded.substring(0, 4), 16);
    const encrypted = encoded.substring(4);
    
    if (isNaN(checksum) || encrypted.length !== checksum) {
      return '';
    }

    const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
    const salt = textToChars(ENCRYPTION_KEY);
    
    return encrypted
      .match(/.{1,2}/g)
      ?.map(hex => {
        const num = parseInt(hex, 16);
        return isNaN(num) ? 0 : num;
      })
      .map((char, i) => String.fromCharCode(char ^ salt[i % salt.length]))
      .join('') || '';
  } catch (error) {
    return '';
  }
};

const textToChars = (text: string): number[] => text.split('').map(c => c.charCodeAt(0));
const byteHex = (n: number): string => ("0" + Number(n).toString(16)).substr(-2);
const charsToText = (chars: number[]): string => chars.map(c => String.fromCharCode(c)).join('');

export const encrypt = (text: string): string => {
  try {
    if (!text || typeof text !== 'string') {
      console.warn('Encrypt: Invalid input');
      return '';
    }

    // Validate that the input is valid JSON
    try {
      JSON.parse(text);
    } catch (e) {
      console.warn('Encrypt: Invalid JSON input');
      return '';
    }

    const salt = textToChars(ENCRYPTION_KEY);
    const textChars = textToChars(text);
    
    const encrypted = textChars.map((char, i) => {
      const saltChar = salt[i % salt.length];
      return byteHex(char ^ saltChar);
    }).join('');

    console.log('Encrypt: Successfully encrypted data');
    return encrypted;
  } catch (error) {
    console.warn('Encrypt: Error during encryption:', error);
    return '';
  }
};

export const decrypt = (encoded: string): string => {
  try {
    if (!encoded || typeof encoded !== 'string') {
      console.warn('Decrypt: Invalid input');
      return '';
    }

    const salt = textToChars(ENCRYPTION_KEY);
    const hexPairs = encoded.match(/.{2}/g);
    
    if (!hexPairs) {
      console.warn('Decrypt: No hex pairs found');
      return '';
    }

    const decrypted = hexPairs.map((hex, i) => {
      const num = parseInt(hex, 16);
      if (isNaN(num)) {
        console.warn('Decrypt: Invalid hex pair:', hex);
        return 0;
      }
      const saltChar = salt[i % salt.length];
      return num ^ saltChar;
    });

    const decryptedText = charsToText(decrypted);

    // Validate that the decrypted data is valid JSON
    try {
      JSON.parse(decryptedText);
      console.log('Decrypt: Successfully decrypted and validated JSON');
      return decryptedText;
    } catch (e) {
      console.warn('Decrypt: Invalid JSON after decryption');
      return '';
    }
  } catch (error) {
    console.warn('Decrypt: Error during decryption:', error);
    return '';
  }
}; 