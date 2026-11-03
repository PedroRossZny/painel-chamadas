/** Address of the NestJS backend. Set NEXT_PUBLIC_API_URL when it runs on another machine. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Name shown at the top of the TV panel. */
export const UNIT_NAME =
  process.env.NEXT_PUBLIC_UNIT_NAME ?? "NOME DO ESTABELECIMENTO";
