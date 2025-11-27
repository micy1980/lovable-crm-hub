export interface PasswordValidationResult {
  valid: boolean;
  message: string | null;
}

export function validatePasswordStrength(
  password: string,
  t: (key: string) => string
): PasswordValidationResult {
  // Check minimum length
  if (password.length < 8) {
    return {
      valid: false,
      message: t('auth.weakPasswordMessage'),
    };
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: t('auth.weakPasswordMessage'),
    };
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: t('auth.weakPasswordMessage'),
    };
  }

  // Check for digit
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: t('auth.weakPasswordMessage'),
    };
  }

  return {
    valid: true,
    message: null,
  };
}
