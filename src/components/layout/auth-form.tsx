"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function getFriendlyAuthError(message?: string) {
  const normalized = (message ?? "").toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password. If this is your first time, use Sign Up first.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email, then try signing in again.";
  }

  return message ?? "Authentication failed. Please try again.";
}

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const supabase = createClient();

      const cleanEmail = email
        .trim()
        .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          toast.error(getFriendlyAuthError(error.message));
          return;
        }

        toast.success("Welcome back to EDVIX");
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error) {
        toast.error(getFriendlyAuthError(error.message));
        return;
      }

      toast.success("Account created. You can sign in now.");
      setMode("signin");
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <div className="bg-primary text-primary-foreground mx-auto flex size-10 items-center justify-center rounded-xl">
          <ShieldCheck className="size-5" />
        </div>
        <CardTitle className="text-2xl">EDVIX Portal</CardTitle>
        <CardDescription>
          Smart Campus authentication with Supabase Auth and role-based access.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "signin" ? "default" : "outline"}
            onClick={() => setMode("signin")}
          >
            Sign In
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "outline"}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </Button>
        </div>

        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@edvix.edu"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </div>

        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              options={[
                { label: "Student", value: "student" },
                { label: "Faculty", value: "faculty" },
                { label: "Admin", value: "admin" },
              ]}
            />
          </div>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={isPending || !email.trim() || !password.trim() || (mode === "signup" && !name.trim())}
          onClick={submit}
        >
          {mode === "signin" ? "Sign In" : "Create Account"}
        </Button>
      </CardContent>
    </Card>
  );
}
