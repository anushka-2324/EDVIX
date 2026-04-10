import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { type UserProfile, type UserRole } from "@/lib/types";

type AuthContext = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  user: { id: string; email?: string } | null;
  profile: UserProfile | null;
};

type AuthenticatedContext = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  user: { id: string; email?: string };
  profile: UserProfile;
};

type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown> | null;
};

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function buildFallbackProfile(user: SupabaseAuthUser): UserProfile {
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? "",
    name: (metadata.name as string | undefined) ?? user.email?.split("@")[0] ?? "Campus User",
    role: ((metadata.role as UserRole | undefined) ?? "student") as UserRole,
  };
}

function isMissingUsersTableError(error: unknown): error is PostgrestLikeError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as PostgrestLikeError;
  return maybeError.code === "PGRST205" && (maybeError.message ?? "").includes("public.users");
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    const databaseError = error as PostgrestLikeError;

    if (isMissingUsersTableError(databaseError)) {
      const fallbackProfile = buildFallbackProfile(user);
      return {
        supabase,
        user: { id: user.id, email: user.email ?? "" },
        profile: fallbackProfile,
      };
    }

    throw new Error("Failed to load user profile.");
  }

  if (!profile) {
    const fallbackProfile = buildFallbackProfile(user);
    const { error: upsertError } = await supabase.from("users").upsert(fallbackProfile);

    if (upsertError) {
      const databaseError = upsertError as PostgrestLikeError;

      if (!isMissingUsersTableError(databaseError)) {
        throw new Error("Failed to save user profile.");
      }
    }

    return { supabase, user: { id: user.id, email: user.email ?? "" }, profile: fallbackProfile };
  }

  return {
    supabase,
    user: { id: user.id, email: user.email ?? "" },
    profile: profile as UserProfile,
  };
}

export async function requireUser(): Promise<AuthenticatedContext> {
  const context = await getAuthContext();
  if (!context.user || !context.profile) {
    redirect("/login");
  }

  return {
    supabase: context.supabase,
    user: context.user,
    profile: context.profile,
  };
}

export async function requireRole(roles: UserRole[]): Promise<AuthenticatedContext> {
  const context = await requireUser();
  if (!roles.includes(context.profile.role)) {
    redirect("/dashboard");
  }
  return context;
}
