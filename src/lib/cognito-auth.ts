import { setSession, type AuthSession } from "@/lib/auth-session";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";

const COGNITO_REGION = "us-east-1";
const COGNITO_USER_POOL_ID = "us-east-1_wH7XSjisU";
const COGNITO_CLIENT_ID = "1h9q50o6q8112en493onho8lqg";
const COGNITO_DOMAIN = "https://travelian-auth-106237071463.auth.us-east-1.amazoncognito.com";
const PKCE_VERIFIER_KEY = "travelian.cognito.pkce.verifier";
const PKCE_STATE_KEY = "travelian.cognito.pkce.state";
const userPool = new CognitoUserPool({
  UserPoolId: COGNITO_USER_POOL_ID,
  ClientId: COGNITO_CLIENT_ID,
});

type TokenResponse = {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

type CognitoProfile = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  "cognito:groups"?: string[];
  "cognito:username"?: string;
};

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  source.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBase64Url(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  return crypto.subtle.digest("SHA-256", encoded);
}

function redirectUri() {
  return `${window.location.origin}/auth/callback`;
}

function authUrl(path: "oauth2/authorize" | "signup", extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: redirectUri(),
    ...extra,
  });
  return `${COGNITO_DOMAIN}/${path}?${params.toString()}`;
}

async function startHostedUi(path: "oauth2/authorize" | "signup") {
  const verifier = randomBase64Url(64);
  const challenge = base64Url(await sha256(verifier));
  const state = randomBase64Url(24);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  window.location.assign(authUrl(path, {
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  }));
}

export function startCognitoSignIn() {
  return startHostedUi("oauth2/authorize");
}

export function startCognitoSignUp() {
  return startHostedUi("signup");
}

async function cognitoRequest<T>(target: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || data.__type || "The request could not be completed.";
    throw new Error(String(message).replace(/^.*#/, ""));
  }
  return data as T;
}

function decodeJwtPayload(token: string): CognitoProfile {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Cognito did not return a valid ID token.");
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
  return JSON.parse(atob(padded));
}

function sessionFromTokens(tokens: TokenResponse): AuthSession {
  if (!tokens.id_token || !tokens.access_token) {
    throw new Error("Cognito did not return a complete sign-in token response.");
  }

  const profile = decodeJwtPayload(tokens.id_token);
  const email = profile.email || profile["cognito:username"];
  if (!email) throw new Error("The sign-in response did not include an email address.");

  const name = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(" ") || email.split("@")[0];
  const session: AuthSession = {
    email,
    name,
    sub: profile.sub,
    provider: "Cognito",
    createdAt: new Date().toISOString(),
    groups: profile["cognito:groups"] || [],
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
  setSession(session);
  return session;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const username = email.trim().toLowerCase();
  const cognitoUser = new CognitoUser({ Username: username, Pool: userPool });
  const authenticationDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const accessToken = session.getAccessToken();
        const expiresIn = Math.max(1, accessToken.getExpiration() - Math.floor(Date.now() / 1000));
        resolve(sessionFromTokens({
          id_token: session.getIdToken().getJwtToken(),
          access_token: accessToken.getJwtToken(),
          refresh_token: session.getRefreshToken().getToken(),
          expires_in: expiresIn,
          token_type: "Bearer",
        }));
      },
      onFailure: (error) => {
        reject(new Error(error?.message || "Sign in failed. Please check your email and password."));
      },
      newPasswordRequired: () => {
        reject(new Error("This account requires a new password before sign in can continue."));
      },
      mfaRequired: () => {
        reject(new Error("MFA is required for this account. Please contact Travelian support."));
      },
      totpRequired: () => {
        reject(new Error("Authenticator verification is required for this account."));
      },
    });
  });
}

export async function signUpWithPassword(email: string, password: string, name: string) {
  const username = email.trim().toLowerCase();
  const attributes = [
    new CognitoUserAttribute({ Name: "email", Value: username }),
    new CognitoUserAttribute({ Name: "name", Value: name.trim() || username.split("@")[0] }),
  ];

  return new Promise<{ UserSub: string; UserConfirmed: boolean }>((resolve, reject) => {
    userPool.signUp(username, password, attributes, [], (error, result) => {
      if (error || !result) {
        reject(new Error(error?.message || "Signup failed. Please try again."));
        return;
      }
      resolve({
        UserSub: result.userSub,
        UserConfirmed: result.userConfirmed,
      });
    });
  });
}

export async function confirmSignUp(email: string, code: string) {
  const cognitoUser = new CognitoUser({
    Username: email.trim().toLowerCase(),
    Pool: userPool,
  });

  return new Promise<Record<string, never>>((resolve, reject) => {
    cognitoUser.confirmRegistration(code.trim(), true, (error) => {
      if (error) {
        reject(new Error(error.message || "Confirmation failed. Please check the code."));
        return;
      }
      resolve({});
    });
  });
}

async function exchangeCode(code: string): Promise<TokenResponse> {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) throw new Error("The sign-in session expired. Please try again.");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: COGNITO_CLIENT_ID,
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });

  const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Cognito could not complete the sign-in request.");
  }

  return response.json();
}

export async function completeCognitoRedirect(urlSearch: string): Promise<AuthSession> {
  const params = new URLSearchParams(urlSearch);
  const error = params.get("error_description") || params.get("error");
  if (error) throw new Error(error);

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = sessionStorage.getItem(PKCE_STATE_KEY);
  if (!code) throw new Error("Cognito did not return an authorization code.");
  if (!state || state !== expectedState) throw new Error("The sign-in state was invalid. Please try again.");

  const tokens = await exchangeCode(code);

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
  return sessionFromTokens(tokens);
}

export function cognitoLogoutUrl() {
  const logoutUri = `${window.location.origin}/`;
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: logoutUri,
  });
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

export const cognitoConfig = {
  region: COGNITO_REGION,
  userPoolId: COGNITO_USER_POOL_ID,
  clientId: COGNITO_CLIENT_ID,
  domain: COGNITO_DOMAIN,
};
