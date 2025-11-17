/**
 * Password generation utility
 * Generates cryptographically secure random passwords
 */

/**
 * Generate a secure random password
 * @param length Password length (default: 16)
 * @returns Secure random password string
 */
export function generateSecurePassword(length: number = 16): string {
  // Character sets
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Combine all character sets
  const allChars = uppercase + lowercase + numbers + symbols;
  
  // Ensure at least one character from each set
  let password = '';
  password += uppercase[getRandomInt(uppercase.length)];
  password += lowercase[getRandomInt(lowercase.length)];
  password += numbers[getRandomInt(numbers.length)];
  password += symbols[getRandomInt(symbols.length)];
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[getRandomInt(allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return shuffleString(password);
}

/**
 * Get a cryptographically secure random integer
 * @param max Maximum value (exclusive)
 * @returns Random integer between 0 and max-1
 */
function getRandomInt(max: number): number {
  // Use crypto.getRandomValues for cryptographically secure randomness
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Shuffle a string using Fisher-Yates algorithm
 * @param str String to shuffle
 * @returns Shuffled string
 */
function shuffleString(str: string): string {
  const array = str.split('');
  
  for (let i = array.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  
  return array.join('');
}
