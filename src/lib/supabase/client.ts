"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error("[Supabase Client] Environment variables missing!", {
      urlLoaded: !!supabaseUrl,
      keyLoaded: !!anonKey,
    });
  } else {
    // Log masked URL to ensure it's accessible and initialized correctly
    const maskedUrl = supabaseUrl.replace(/(https?:\/\/)([^.]*)(.*)/, "$1***$3");
    console.log("[Supabase Client] Initialized with URL:", maskedUrl);
  }

  return createBrowserClient(supabaseUrl!, anonKey!);
}
