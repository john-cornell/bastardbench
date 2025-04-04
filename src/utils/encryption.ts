// Simple encryption key - in production, this should be more secure
const ENCRYPTION_KEY = 'bastard-bench-encryption-key';

export const encrypt = (text: string): string => {
  try {
    const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
    const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code: number) => textToChars(ENCRYPTION_KEY).reduce((a, b) => a ^ b, code);

    return text
      .split('')
      .map(textToChars)
      .map(applySaltToChar)
      .map(byteHex)
      .join('');
  } catch (e) {
    console.error('Encryption failed:', e);
    return '';
  }
};

export const decrypt = (encoded: string): string => {
  try {
    const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
    const applySaltToChar = (code: number) => textToChars(ENCRYPTION_KEY).reduce((a, b) => a ^ b, code);
    
    return encoded
      .match(/.{1,2}/g)
      ?.map(hex => parseInt(hex, 16))
      .map(applySaltToChar)
      .map(charCode => String.fromCharCode(charCode))
      .join('') || '';
  } catch (e) {
    console.error('Decryption failed:', e);
    return '';
  }
}; 