import type { UserRole, UserStatus } from "./waitlist";

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthUser;
}
