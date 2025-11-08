import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseServerClient = ReturnType<typeof createServerClient>;

function getEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

let cachedSupabaseUrl: string | null = null;
let cachedSupabaseAnonKey: string | null = null;

function ensureSupabaseUrl(): string {
	if (!cachedSupabaseUrl) {
		cachedSupabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
	}
	return cachedSupabaseUrl;
}

function ensureSupabaseAnonKey(): string {
	if (!cachedSupabaseAnonKey) {
		cachedSupabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
	}
	return cachedSupabaseAnonKey;
}

export async function createSupabaseServerClient(): Promise<SupabaseServerClient> {
	const cookieStore = await cookies();
	const supabaseUrl = ensureSupabaseUrl();
	const supabaseAnonKey = ensureSupabaseAnonKey();

	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll: () => cookieStore.getAll(),
			setAll: (cookiesToSet) => {
				try {
					cookiesToSet.forEach(({ name, value, options }) =>
						cookieStore.set(name, value, options),
					);
				} catch {
					// `cookies().set` cannot be called during static rendering; ignore in that context.
				}
			},
		},
	});
}
