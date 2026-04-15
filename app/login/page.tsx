"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInlineError(null);
    setIsSubmitting(true);

    try {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        setInlineError(parsed.error.issues[0]?.message ?? "Invalid form values.");
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();
      if (!response.ok) {
        setInlineError(result.message ?? "Login failed.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-6 py-12 text-on-surface">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-primary">
            <span className="material-symbols-outlined text-3xl">shield_lock</span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight">Welcome Back</h1>
          <p className="text-sm text-on-surface-variant">
            Login to continue your SehatMok nutrition journey.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 editorial-shadow"
        >
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {inlineError ? (
            <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
              {inlineError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-on-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
