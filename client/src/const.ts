export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const getOauthConfig = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  return { oauthPortalUrl, appId };
};

export const isOauthConfigured = () => {
  const { oauthPortalUrl, appId } = getOauthConfig();
  if (!oauthPortalUrl || !appId) return false;
  try {
    new URL(oauthPortalUrl);
  } catch {
    return false;
  }
  return true;
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const { oauthPortalUrl, appId } = getOauthConfig();
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  if (!isOauthConfigured()) {
    return `${window.location.origin}/`;
  }

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
