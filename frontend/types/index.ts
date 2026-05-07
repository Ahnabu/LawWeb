// Common types used across the application

export type UserRole = "client" | "lawyer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  barId?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  status: number;
  message: string;
  data?: T;
  error?: Record<string, string>;
}
