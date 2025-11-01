import { createBrowserClient } from "@supabase/ssr";

function getEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function createSupabaseBrowserClient() {
	const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
	const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

	return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
