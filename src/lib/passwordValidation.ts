export interface PasswordValidationResult {
  valid: boolean;
  message: string | null;
}

export interface PasswordValidationOptions {
  currentUserRole: string;
  targetUserRole: string;
  t: (key: string) => string;
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

/**
 * Validate password with role-based rules
 * 
 * Rules:
 * - SA editing non-SA: min 1 char (actually 6 due to Supabase platform requirement)
 * - Admin editing non-SA/non-Admin: min 1 char (actually 6 due to Supabase platform requirement)
 * - All other cases: full strength validation (8+ chars with complexity)
 */
export function validatePasswordWithRoles(
  password: string,
  options: PasswordValidationOptions
): PasswordValidationResult {
  const { currentUserRole, targetUserRole, t } = options;

  // Empty password is always invalid when required
  if (!password || password.trim() === '') {
    return {
      valid: false,
      message: t('users.passwordRequired'),
    };
  }

  // SA setting password for non-SA user: only check min 6 chars (platform requirement)
  if (currentUserRole === 'super_admin' && targetUserRole !== 'super_admin') {
    if (password.length < 6) {
      return {
        valid: false,
        message: 'A jelszónak legalább 6 karakter hosszúnak kell lennie (platform követelmény)',
      };
    }
    return { valid: true, message: null };
  }

  // Admin setting password for non-SA and non-Admin user: only check min 6 chars (platform requirement)
  if (
    currentUserRole === 'admin' &&
    targetUserRole !== 'super_admin' &&
    targetUserRole !== 'admin'
  ) {
    if (password.length < 6) {
      return {
        valid: false,
        message: 'A jelszónak legalább 6 karakter hosszúnak kell lennie (platform követelmény)',
      };
    }
    return { valid: true, message: null };
  }

  // All other cases: full strength validation
  return validatePasswordStrength(password, t);
}
