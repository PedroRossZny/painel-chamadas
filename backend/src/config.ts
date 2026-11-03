/**
 * Sites allowed to call the API (the menu, the panel and, in a real
 * installation, the address of the health unit's system). Set in
 * CORS_ORIGINS as a comma separated list.
 */
export function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
