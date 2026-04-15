import jwt, { JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "sehatmok_token";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }
  return secret;
};

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
};

export const signJwt = (userId: string): string => {
  return jwt.sign({ sub: userId }, getJwtSecret(), {
    expiresIn: `${AUTH_COOKIE_MAX_AGE_SECONDS}s`,
  });
};

const decodeJwtUserId = (token: string): string | null => {
  const secret = getJwtSecret();

  try {
    const payload = jwt.verify(token, secret) as JwtPayload | string;
    if (typeof payload === "string") {
      return null;
    }
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
};

export const verifyJwtFromCookies = async (): Promise<string | null> => {
  getJwtSecret();

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return decodeJwtUserId(token);
};

export const requireUserId = async (): Promise<string> => {
  const userId = await verifyJwtFromCookies();
  if (!userId) {
    throw new UnauthorizedError();
  }
  return userId;
};

export const setAuthCookie = (response: NextResponse, userId: string) => {
  response.cookies.set(AUTH_COOKIE_NAME, signJwt(userId), authCookieOptions);
};

export const clearAuthCookie = (response: NextResponse) => {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...authCookieOptions,
    maxAge: 0,
  });
};
