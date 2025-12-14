import fs from 'fs';
import path from 'path';

let cachedToken: string | null = null;

export async function getServiceToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  // First check if token is set directly
  if (process.env.ZITADEL_SERVICE_USER_TOKEN) {
    cachedToken = process.env.ZITADEL_SERVICE_USER_TOKEN;
    return cachedToken;
  }

  // Try to read from file
  const tokenFile = process.env.ZITADEL_SERVICE_USER_TOKEN_FILE;
  if (tokenFile) {
    try {
      // Wait for file to exist (max 30 seconds)
      let attempts = 0;
      while (!fs.existsSync(tokenFile) && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      if (fs.existsSync(tokenFile)) {
        cachedToken = fs.readFileSync(tokenFile, 'utf-8').trim();
        return cachedToken;
      }
    } catch (error) {
      console.error('Error reading token file:', error);
    }
  }

  throw new Error('No service token available. Set ZITADEL_SERVICE_USER_TOKEN or ZITADEL_SERVICE_USER_TOKEN_FILE');
}

export function clearTokenCache() {
  cachedToken = null;
}
