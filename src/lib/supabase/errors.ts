type PostgrestLikeError = {
  code?: string;
  message?: string;
};

const SCHEMA_HINT = "Database schema is missing. Run supabase/schema.sql in Supabase SQL Editor.";

export function isMissingTableError(error: unknown, table: string) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as PostgrestLikeError;
  return (
    maybeError.code === "PGRST205" &&
    (maybeError.message ?? "").includes(`public.${table}`)
  );
}

export function isMissingColumnError(error: unknown, table: string, column: string) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as PostgrestLikeError;
  const message = maybeError.message ?? "";

  return (
    maybeError.code === "42703" &&
    (message.includes(`column ${table}.${column}`) ||
      message.includes(`column \"${column}\"`) ||
      message.includes(`${table}.${column}`))
  );
}

export function toDbError(error: unknown, fallback: string, table?: string) {
  if (table && isMissingTableError(error, table)) {
    return new Error(SCHEMA_HINT);
  }

  if (!error || typeof error !== "object") {
    return new Error(fallback);
  }

  const maybeError = error as PostgrestLikeError;
  return new Error(maybeError.message ?? fallback);
}
