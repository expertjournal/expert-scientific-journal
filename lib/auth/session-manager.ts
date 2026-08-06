/**
 * Enterprise Session & Token Rotation Manager
 */

export interface UserSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  ipAddress: string;
  userAgent: string;
  isRevoked: boolean;
  expiresAt: string;
  createdAt: string;
}

const activeSessions: UserSession[] = [];

export class SessionManager {
  public static createSession(
    userId: string,
    ipAddress = "127.0.0.1",
    userAgent = "Mozilla/5.0"
  ): { session: UserSession; refreshToken: string } {
    const rawRefreshToken = "rt_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const refreshTokenHash = btoa(rawRefreshToken);

    const expires = new Date();
    expires.setDate(expires.getDate() + 30); // 30 days session

    const session: UserSession = {
      id: "sess-" + Date.now(),
      userId,
      refreshTokenHash,
      ipAddress,
      userAgent,
      isRevoked: false,
      expiresAt: expires.toISOString(),
      createdAt: new Date().toISOString(),
    };

    activeSessions.unshift(session);
    return { session, refreshToken: rawRefreshToken };
  }

  public static rotateRefreshToken(oldRefreshToken: string): { newRefreshToken: string; userId: string } | null {
    const oldHash = btoa(oldRefreshToken);
    const session = activeSessions.find((s) => s.refreshTokenHash === oldHash && !s.isRevoked);

    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      session.isRevoked = true;
      return null;
    }

    // Issue new token and revoke old hash
    const newRawRefreshToken = "rt_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    session.refreshTokenHash = btoa(newRawRefreshToken);

    return { newRefreshToken: newRawRefreshToken, userId: session.userId };
  }

  public static revokeSession(sessionId: string) {
    const session = activeSessions.find((s) => s.id === sessionId);
    if (session) session.isRevoked = true;
  }

  public static revokeAllUserSessions(userId: string) {
    activeSessions.forEach((s) => {
      if (s.userId === userId) s.isRevoked = true;
    });
  }

  public static getUserSessions(userId: string): UserSession[] {
    return activeSessions.filter((s) => s.userId === userId && !s.isRevoked);
  }
}
