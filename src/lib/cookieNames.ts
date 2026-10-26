import { isProduction } from "./env";
const PREFIX = isProduction ? "__Host-" : "";

export const COOKIE_NAMES = {
  access: `${PREFIX}access-token`,
  refresh: `${PREFIX}refresh-token`,
  flow: `${PREFIX}auth-token`,
  oauth: `${PREFIX}oauth_state`,
} as const;
