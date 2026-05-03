"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

type LoginType = "USER" | "ADMIN";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedLoginType, setSelectedLoginType] = useState<LoginType>("USER");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginOptions: Array<{
    type: LoginType;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      type: "USER",
      label: "User",
      description: "Open your nutrition dashboard",
      icon: "person",
    },
    {
      type: "ADMIN",
      label: "Admin",
      description: "Open the admin console",
      icon: "admin_panel_settings",
    },
  ];

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

      if (selectedLoginType === "ADMIN" && result.user?.role !== "ADMIN") {
        setInlineError("This account does not have admin access.");
        return;
      }

      router.replace(selectedLoginType === "ADMIN" ? "/admin" : "/");
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
          <div className="grid grid-cols-2 gap-3">
            {loginOptions.map((option) => {
              const isSelected = selectedLoginType === option.type;

              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setSelectedLoginType(option.type);
                    setInlineError(null);
                  }}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container"
                  }`}
                  aria-pressed={isSelected}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      isSelected ? "text-primary" : "text-on-surface-variant"
                    }`}
                  >
                    {option.icon}
                  </span>
                  <span className="mt-2 block font-bold">{option.label}</span>
                  <span className="mt-1 block text-xs text-on-surface-variant">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

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
