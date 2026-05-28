export const WAITLIST_STATUSES = ["pending", "active", "rejected"] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["pending", "active", "deactivated"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface WaitlistSignupInput {
  firstName: string;
  lastName: string;
  email: string;
  businessIndustry: string;
}

export interface WaitlistEntryPublic {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  businessIndustry: string;
  status: WaitlistStatus;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  businessIndustry: string | null;
  role: UserRole;
  status: UserStatus;
  hasPassword: boolean;
  waitlistId: string | null;
  createdAt: string;
  updatedAt: string;
}
