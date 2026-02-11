/**
 * Feature flags for the application
 * Use environment variables to enable/disable features
 */

/**
 * Check if image upload feature is enabled
 * Requires ENABLE_UPLOADS environment variable to be set to "true"
 */
export function isUploadEnabled(): boolean {
  return process.env.ENABLE_UPLOADS === "true";
}

/**
 * Get the feature availability message
 */
export function getUploadDisabledMessage(): string {
  return "This feature is unavailable in this version";
}
