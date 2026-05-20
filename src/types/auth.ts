export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
}
