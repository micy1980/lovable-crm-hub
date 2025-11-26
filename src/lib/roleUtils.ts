export type UserRole = 'super_admin' | 'admin' | 'normal' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean | null;
  can_delete: boolean | null;
  can_view_logs: boolean | null;
  language: string | null;
}

export const isSuperAdmin = (profile: UserProfile | null | undefined): boolean => {
  return profile?.role === 'super_admin';
};

export const isAdmin = (profile: UserProfile | null | undefined): boolean => {
  return profile?.role === 'admin';
};

export const isAdminOrAbove = (profile: UserProfile | null | undefined): boolean => {
  return profile?.role === 'super_admin' || profile?.role === 'admin';
};

export const isNormal = (profile: UserProfile | null | undefined): boolean => {
  return profile?.role === 'normal';
};

export const isViewer = (profile: UserProfile | null | undefined): boolean => {
  return profile?.role === 'viewer';
};

export const canManageCompanies = (profile: UserProfile | null | undefined): boolean => {
  return isSuperAdmin(profile) || isAdmin(profile);
};

export const canManageUsers = (profile: UserProfile | null | undefined): boolean => {
  return isSuperAdmin(profile) || isAdmin(profile);
};

export const canDelete = (profile: UserProfile | null | undefined): boolean => {
  return profile?.can_delete === true;
};

export const canViewLogs = (profile: UserProfile | null | undefined): boolean => {
  return profile?.can_view_logs === true;
};