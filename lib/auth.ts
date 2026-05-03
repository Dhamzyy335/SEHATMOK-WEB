import jwt, { JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const AUTH_COOKIE_NAME = "sehatmok_token";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export class UnauthorizedError extends Error {
  statusCode: 401 | 403;

  constructor(message = "Unauthorized.", statusCode: 401 | 403 = 401) {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = statusCode;
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

export const getInactiveAccountMessage = (status: string): string => {
  return status === "SUSPENDED"
    ? "Your account has been suspended. Please contact the administrator."
    : "Your account is inactive. Please contact the administrator.";
};

export const requireUserId = async (): Promise<string> => {
  const userId = await verifyJwtFromCookies();
  if (!userId) {
    throw new UnauthorizedError();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError();
  }

  if (user.status !== "ACTIVE") {
    throw new UnauthorizedError(getInactiveAccountMessage(user.status), 403);
  }

  return user.id;
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
