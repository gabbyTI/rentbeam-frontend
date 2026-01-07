/**
 * Application configuration
 * Single source of truth for app branding and settings
 */
export const APP_CONFIG = {
  name: 'RentBeam',
  version: '1.0.0',
  domain: 'rentbeam.app',
  storage: {
    prefix: 'rentbeam_',
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
