/**
 * API Configuration for the Tennis Coach Platform frontend.
 *
 * This configuration reads the API URL from environment variables,
 * allowing different URLs for development and production environments.
 *
 * Environment Variables:
 * - VITE_API_URL: The base URL for the API (e.g., https://tennis-coach-api.onrender.com)
 *
 * @example
 * // In development (default)
 * baseUrl = 'http://localhost:3333'
 *
 * // In production (set via Cloudflare Pages environment variables)
 * baseUrl = 'https://tennis-coach-api.onrender.com'
 */
export const API_CONFIG = {
  /**
   * Base URL for API requests.
   * Reads from VITE_API_URL environment variable with localhost fallback.
   */
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3333',

  /**
   * Request timeout in milliseconds.
   */
  timeout: 30000,

  /**
   * API version prefix.
   */
  apiPrefix: '/api',
} as const;

/**
 * Get the full API URL with the API prefix.
 * @returns The complete API base URL including the /api prefix.
 */
export function getApiUrl(): string {
  return `${API_CONFIG.baseUrl}${API_CONFIG.apiPrefix}`;
}

export default API_CONFIG;
