/**
 * Validates password entropy and length
 * Requirements:
 * - At least 12 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * - Contains at least one special character
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; message?: string } => {
  if (!password || password.length < 12) {
    return { isValid: false, message: "Password must be at least 12 characters." };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUppercase) return { isValid: false, message: "Password must contain at least one uppercase letter." };
  if (!hasLowercase) return { isValid: false, message: "Password must contain at least one lowercase letter." };
  if (!hasNumber) return { isValid: false, message: "Password must contain at least one number." };
  if (!hasSpecial) return { isValid: false, message: "Password must contain at least one special character." };

  return { isValid: true };
};
