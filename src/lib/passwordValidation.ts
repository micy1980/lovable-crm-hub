export interface PasswordValidationResult {
  valid: boolean;
  message: string | null;
}

export function validatePasswordStrength(
  password: string,
  t: (key: string) => string
): PasswordValidationResult {
  // Check minimum length (8 chars)
  if (password.length < 8) {
    return {
      valid: false,
      message: t('auth.passwordMinLength8'),
    };
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: t('auth.passwordRequireLowercase'),
    };
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: t('auth.passwordRequireUppercase'),
    };
  }

  // Check for digit
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: t('auth.passwordRequireNumber'),
    };
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      message: t('auth.passwordRequireSpecial'),
    };
  }

  return {
    valid: true,
    message: null,
  };
}
