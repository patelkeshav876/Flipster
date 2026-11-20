/**
 * Admin Authentication & Authorization
 * Supports triple verification:
 * 1. Automatic verification via Telegram user ID (1446312281) or @username whitelist
 * 2. Automatic verification via Google OAuth email (patelkeshab876@gmail.com)
 * 3. Secret Master PIN unlock (default 8760)
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_SESSION_KEY = "flipster_admin_authenticated";
const STORAGE_PIN_KEY = "flipster_admin_custom_pin";
const STORAGE_WHITELIST_KEY = "flipster_admin_whitelist";

const DEFAULT_PIN = "8760";

// Pre-authorized Telegram usernames and numeric User IDs
const DEFAULT_WHITELISTED_IDENTITIES = [
  "1446312281",
  "patelkeshav876",
  "patelkeshav",
  "patelkeshab876",
];

// Pre-authorized Google Admin Emails
const DEFAULT_ADMIN_EMAILS = [
  "patelkeshab876@gmail.com",
  "patelkeshav876@gmail.com",
  "aakharisamosha36@gmail.com",
];

export interface TelegramAdminUser {
  id: number;
  username?: string;
  firstName: string;
}

export type AdminAuthStatus = {
  isAdmin: boolean;
  method: "telegram" | "email" | "pin" | "none";
  telegramUser: TelegramAdminUser | null;
  adminEmail: string | null;
  isTelegramWhitelisted: boolean;
};

export const AdminAuth = {
  /**
   * Retrieves the current Telegram user if running inside the Mini App
   */
  getTelegramUser(): TelegramAdminUser | null {
    if (typeof window === "undefined") return null;
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) return null;
    return {
      id: tgUser.id,
      username: tgUser.username,
      firstName: tgUser.first_name,
    };
  },

  /**
   * Returns list of authorized Telegram usernames / IDs
   */
  getWhitelistedIdentities(): string[] {
    const list = [...DEFAULT_WHITELISTED_IDENTITIES];
    if (typeof window !== "undefined") {
      try {
        const custom = localStorage.getItem(STORAGE_WHITELIST_KEY);
        if (custom) {
          const parsed = JSON.parse(custom);
          if (Array.isArray(parsed)) {
            list.push(...parsed);
          }
        }
      } catch {
        // ignore parse error
      }
    }
    return Array.from(new Set(list.map((s) => s.toLowerCase().replace(/^@/, ""))));
  },

  /**
   * Checks whether an email matches the Admin whitelist
   */
  isEmailAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return DEFAULT_ADMIN_EMAILS.includes(clean);
  },

  /**
   * Checks whether the current Telegram user matches the admin whitelist
   */
  isTelegramWhitelisted(): boolean {
    const tg = this.getTelegramUser();
    if (!tg) return false;

    const whitelist = this.getWhitelistedIdentities();
    const idStr = String(tg.id);
    const username = tg.username ? tg.username.toLowerCase().replace(/^@/, "") : "";

    return whitelist.includes(idStr) || (username.length > 0 && whitelist.includes(username));
  },

  /**
   * Checks whether the session was unlocked using the Master PIN
   */
  isPinUnlocked(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_SESSION_KEY) === "true";
  },

  /**
   * Current active PIN (either custom stored in browser or default 8760)
   */
  getCurrentPin(): string {
    if (typeof window !== "undefined") {
      const customPin = localStorage.getItem(STORAGE_PIN_KEY);
      if (customPin && customPin.trim().length >= 4) {
        return customPin.trim();
      }
    }
    return DEFAULT_PIN;
  },

  /**
   * Verify the entered PIN
   */
  verifyPin(enteredPin: string): boolean {
    const targetPin = this.getCurrentPin();
    if (enteredPin.trim() === targetPin) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_SESSION_KEY, "true");
      }
      return true;
    }
    return false;
  },

  /**
   * Update the Master PIN
   */
  updatePin(newPin: string): boolean {
    if (!newPin || newPin.trim().length < 4) return false;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_PIN_KEY, newPin.trim());
      return true;
    }
    return false;
  },

  /**
   * Add a Telegram username or numeric ID to the whitelist
   */
  addWhitelist(identity: string): void {
    if (!identity || typeof window === "undefined") return;
    const clean = identity.trim().toLowerCase().replace(/^@/, "");
    const current = this.getWhitelistedIdentities();
    if (!current.includes(clean)) {
      current.push(clean);
      localStorage.setItem(STORAGE_WHITELIST_KEY, JSON.stringify(current));
    }
  },

  /**
   * Log out / lock admin session
   */
  lockAdminSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  },

  /**
   * Trigger Google OAuth login via Supabase
   */
  async signInWithGoogle(): Promise<{ error: Error | null }> {
    try {
      const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },

  /**
   * Sign out of Supabase
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      this.lockAdminSession();
    } catch {
      // ignore
    }
  },

  /**
   * Get full auth status given optional logged-in user email
   */
  getStatus(userEmail?: string | null): AdminAuthStatus {
    const tgUser = this.getTelegramUser();
    const isWhitelisted = this.isTelegramWhitelisted();
    const isEmailMatched = this.isEmailAdmin(userEmail);
    const isPinActive = this.isPinUnlocked();

    if (isEmailMatched) {
      return {
        isAdmin: true,
        method: "email",
        telegramUser: tgUser,
        adminEmail: userEmail || null,
        isTelegramWhitelisted: isWhitelisted,
      };
    }

    if (isWhitelisted) {
      return {
        isAdmin: true,
        method: "telegram",
        telegramUser: tgUser,
        adminEmail: null,
        isTelegramWhitelisted: true,
      };
    }

    if (isPinActive) {
      return {
        isAdmin: true,
        method: "pin",
        telegramUser: tgUser,
        adminEmail: null,
        isTelegramWhitelisted: false,
      };
    }

    return {
      isAdmin: false,
      method: "none",
      telegramUser: tgUser,
      adminEmail: null,
      isTelegramWhitelisted: false,
    };
  },
};
