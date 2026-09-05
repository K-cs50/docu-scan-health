import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";

const searchSchema = z.object({ mode: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in to MedLens" },
      {
        name: "description",
        content: "Sign in or create a MedLens account to organise and verify your medical records.",
      },
      { property: "og:title", content: "Sign in to MedLens" },
      { property: "og:description", content: "Access your traceable medical record workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(mode === "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name },
          },
        });
        if (error) {
          toast.error(
            error.message.toLowerCase().includes("already")
              ? "An account with this email already exists. Try signing in."
              : error.message,
          );
        } else {
          toast.success("Account created. You're signed in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(
            error.message.toLowerCase().includes("invalid")
              ? "Incorrect email or password."
              : error.message,
          );
        }
      }
    } catch {
      toast.error("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
  }

  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-lg font-bold">
          Med<span className="text-primary">Lens</span>
        </Link>
        <div className="surface mt-4 p-7">
          <h1 className="text-2xl font-bold">{isRegister ? "Create your account" : "Sign in"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your documents stay private to your account.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                minLength={6}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>

          <Button variant="outline" className="mt-3 w-full" onClick={onGoogle}>
            Continue with Google
          </Button>

          <button
            type="button"
            onClick={() => setIsRegister((v) => !v)}
            className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {isRegister ? "Already have an account? Sign in" : "New to MedLens? Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
}
