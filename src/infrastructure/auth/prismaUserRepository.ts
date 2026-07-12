import { prisma } from "@/lib/prisma";
import type { User, Profile, HealthProfile, RefreshToken } from "@prisma/client";
import type { CreateUserInput, UserRepository } from "@/core/auth/user.repository";

/**
 * Prisma implementation of the domain UserRepository.
 * All methods are async, throw standard Error on unexpected failures, and
 * return concrete Prisma types to keep the domain layer type‑safe.
 */
export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  }

  async findByAppleId(appleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { appleId } });
  }

  async create(input: CreateUserInput): Promise<User> {
    const { email, passwordHash, googleId, appleId } = input;
    // Ensure we never store a raw password – caller must hash.
    const data: any = { email };
    if (passwordHash) data.passwordHash = passwordHash;
    if (googleId) data.googleId = googleId;
    if (appleId) data.appleId = appleId;
    return prisma.user.create({ data });
  }

  async update(
    id: string,
    patch: Partial<Pick<User, "passwordHash" | "twoFASecret" | "twoFAEnabled" | "emailVerified">>
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: patch,
    });
  }

  // ---------------------------------------------------------------------
  // Profile handling – upsert logic keeps a single source of truth.
  // ---------------------------------------------------------------------
  async upsertProfile(
    userId: string,
    data: Partial<Omit<Profile, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<Profile> {
    return prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async upsertHealthProfile(
    userId: string,
    data: Partial<Omit<HealthProfile, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<HealthProfile> {
    return prisma.healthProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // ---------------------------------------------------------------------
  // Refresh token rotation – tokenHash stores a bcrypt hash of the raw token.
  // ---------------------------------------------------------------------
  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        createdAt: new Date(),
      },
    });
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    // The raw token is never stored; we compare using bcrypt compare elsewhere.
    // This method is kept for completeness – callers may fetch by an identifier.
    return prisma.refreshToken.findFirst({ where: { tokenHash } });
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
