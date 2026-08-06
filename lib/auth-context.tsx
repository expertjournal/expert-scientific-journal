"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type UserRole = "author" | "editor" | "reader" | "admin" | "reviewer";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  institution: string;
  orcid?: string;
  avatarUrl?: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
  password: string;
  role: UserRole;
  orcid?: string;
  avatarUrl?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<{ requiresVerification: boolean; email: string; message: string; sampleCode?: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ message: string; sampleCode?: string }>;
  updateProfile: (updatedFields: Partial<User>) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session via localStorage & /api/auth/me on mount
  useEffect(() => {
    let isMounted = true;

    // Fast client-side rehydration from localStorage
    try {
      const cached = localStorage.getItem("expert_user");
      if (cached) {
        const parsedUser = JSON.parse(cached);
        if (parsedUser && isMounted) {
          setUser(parsedUser);
        }
      }
    } catch (e) {
      console.warn("Error reading cached user:", e);
    }

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setUser((prev) => ({ ...data.user, ...prev }));
          }
        }
      } catch (error) {
        console.error("Failed to rehydrate session:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Ошибка входа" }));
      throw new Error(errorData.message || "Неверный email или пароль");
    }

    const data = await res.json();
    setUser(data.user);
    if (data.user) {
      try {
        localStorage.setItem("expert_user", JSON.stringify(data.user));
      } catch (e) {}
    }
  };

  const register = async (userData: RegisterData) => {
    const allowedPublicRoles: UserRole[] = ["author", "reader"];
    if (!allowedPublicRoles.includes(userData.role)) {
      throw new Error("Недопустимая роль для регистрации. Редактор назначается администратором.");
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Ошибка регистрации" }));
      throw new Error(errorData.message || "Не удалось зарегистрироваться");
    }

    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      try {
        localStorage.setItem("expert_user", JSON.stringify(data.user));
      } catch (e) {}
    }
    return {
      requiresVerification: data.requiresVerification ?? true,
      email: data.email || userData.email,
      message: data.message || "Подтвердите ваш email",
      sampleCode: data.sampleCode,
    };
  };

  const verifyEmail = async (email: string, code: string) => {
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Ошибка подтверждения email" }));
      throw new Error(errorData.message || "Неверный код подтверждения");
    }

    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      try {
        localStorage.setItem("expert_user", JSON.stringify(data.user));
      } catch (e) {}
    }
  };

  const resendVerification = async (email: string) => {
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Ошибка отправки кода" }));
      throw new Error(errorData.message || "Не удалось отправить код");
    }

    const data = await res.json();
    return {
      message: data.message || "Новый код отправлен",
      sampleCode: data.sampleCode,
    };
  };

  const updateProfile = async (updatedFields: Partial<User>) => {
    if (!user) return;
    const updatedUser: User = { ...user, ...updatedFields };
    setUser(updatedUser);
    try {
      localStorage.setItem("expert_user", JSON.stringify(updatedUser));
    } catch (e) {}
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      try {
        localStorage.removeItem("expert_user");
      } catch (e) {}
    }
  };

  const hasRole = useCallback(
    (roles: UserRole[]): boolean => {
      return user ? roles.includes(user.role) : false;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        verifyEmail,
        resendVerification,
        updateProfile,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}