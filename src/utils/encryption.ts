// Simple encryption key - in production, this should be more secure
const ENCRYPTION_KEY = 'bastard-bench-encryption-key';

export const encrypt = (text: string): string => {
  try {
    const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
    const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
    const salt = textToChars(ENCRYPTION_KEY);

    return text
      .split('')
      .map(textToChars)
      .map(code => {
        const salted = code.map((char, i) => char ^ salt[i % salt.length]);
        return salted.map(byteHex).join('');
      })
      .join('');
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
};

export const decrypt = (encoded: string): string => {
  try {
    const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
    const salt = textToChars(ENCRYPTION_KEY);
    
    return encoded
      .match(/.{1,2}/g)
      ?.map(hex => parseInt(hex, 16))
      .map((char, i) => String.fromCharCode(char ^ salt[i % salt.length]))
      .join('') || '';
  } catch (error) {
    console.error('Decryption error:', error);
    return encoded;
  }
}; 