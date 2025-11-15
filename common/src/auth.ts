export type AuthProvider = "google";

export interface UserProfile {
    id: string; // internal user id
    email: string;
    name?: string;
    avatarUrl?: string;
    provider: AuthProvider;
    providerId?: string; // e.g., Google sub
    createdAt: string;
    lastLoginAt?: string;
}

export interface AuthTokenPayload {
    userId: string;
    provider: AuthProvider;
    iat: number;
    exp: number;
}

export interface LoginResponse {
    token: string;
    user: UserProfile;
}
