// Base path configuration
// This is hardcoded since NEXT_PUBLIC_ env vars need to be set at build time
export const BASE_PATH = '/ui/v2/login';

export function getApiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}
