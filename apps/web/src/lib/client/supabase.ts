import { createClient, type AuthError, type Session } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  browserClient = createClient(url, anonKey);
  return browserClient;
}

function isInvalidRefreshTokenError(error: AuthError | null) {
  const message = error?.message.toLowerCase() ?? "";
  return message.includes("refresh token") && (message.includes("invalid") || message.includes("not found"));
}

export async function clearSupabaseBrowserSession() {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => null);
}

export async function getSupabaseBrowserSession(): Promise<Session | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (isInvalidRefreshTokenError(error)) {
    await clearSupabaseBrowserSession();
    return null;
  }

  return data.session ?? null;
}
