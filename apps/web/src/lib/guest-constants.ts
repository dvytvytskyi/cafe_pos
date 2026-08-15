export const GUEST_SESSION_COOKIE = 'guest_session';
export const GUEST_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export const GUEST_OTP_TTL_SECONDS = 60 * 5; // 5 minutes
export const GUEST_OTP_MAX_ATTEMPTS = 5;
export const GUEST_SUPPORTED_LOCALES = ['en', 'es', 'ca', 'uk'] as const;
export type GuestLocale = (typeof GUEST_SUPPORTED_LOCALES)[number];
export const DEFAULT_GUEST_LOCALE: GuestLocale = 'en';
export const DEFAULT_EMENU_IMAGE =
  'https://images.pexels.com/photos/37417630/pexels-photo-37417630.jpeg';

export interface GuestSessionPayload {
  sub: string; // customerId
  phone: string;
  name: string;
  exp: number;
  iat: number;
}
