/**
 * Admin Authentication & Authorization
 * Supports dual verification:
 * 1. Automatic verification via Telegram Mini App user ID or @username whitelist
 * 2. Secret Master PIN unlock (works on desktop/mobile browsers & Telegram)
 */

const STORAGE_SESSION_KEY = "flipster_admin_authenticated";
const STORAGE_PIN_KEY = "flipster_admin_custom_pin";
const STORAGE_WHITELIST_KEY = "flipster_admin_whitelist";

const DEFAULT_PIN = "8760";
const DEFAULT_WHITELISTED_USERNAMES = [
  "patelkeshav876",
  "patelkeshav",
];

export interface TelegramAdminUser {
  id: number;
  username?: string;
  firstName: string;
}

export type AdminAuthStatus = {
  isAdmin: boolean;
  method: "telegram" | "pin" | "none";
  telegramUser: TelegramAdminUser | null;
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
    const list = [...DEFAULT_WHITELISTED_USERNAMES];
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
        // ignore storage parse errors
      }
    }
    return Array.from(new Set(list.map((s) => s.toLowerCase().replace(/^@/, ""))));
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
   * Get full auth status
   */
  getStatus(): AdminAuthStatus {
    const tgUser = this.getTelegramUser();
    const isWhitelisted = this.isTelegramWhitelisted();
    const isPinActive = this.isPinUnlocked();

    if (isWhitelisted) {
      return {
        isAdmin: true,
        method: "telegram",
        telegramUser: tgUser,
        isTelegramWhitelisted: true,
      };
    }

    if (isPinActive) {
      return {
        isAdmin: true,
        method: "pin",
        telegramUser: tgUser,
        isTelegramWhitelisted: false,
      };
    }

    return {
      isAdmin: false,
      method: "none",
      telegramUser: tgUser,
      isTelegramWhitelisted: false,
    };
  },
};
