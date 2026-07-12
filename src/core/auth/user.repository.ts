import type { User, Profile, HealthProfile, RefreshToken } from "@prisma/client";

export interface CreateUserInput {
  email: string;
  passwordHash?: string | null;
  googleId?: string | null;
  appleId?: string | null;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findByAppleId(appleId: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  update(
    id: string,
    patch: Partial<Pick<User, "passwordHash" | "twoFASecret" | "twoFAEnabled" | "emailVerified">>
  ): Promise<User>;

  // Profiles
  upsertProfile(
    userId: string,
    data: Partial<Omit<Profile, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<Profile>;
  upsertHealthProfile(
    userId: string,
    data: Partial<Omit<HealthProfile, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<HealthProfile>;

  // Refresh tokens (rotation)
  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken>;
  findRefreshToken(tokenHash: string): Promise<RefreshToken | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
