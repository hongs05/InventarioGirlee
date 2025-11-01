import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SupabaseServerClient = ReturnType<typeof createServerClient>;

function getEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export async function createSupabaseServerClient(): Promise<SupabaseServerClient> {
	const cookieStore = await cookies();
	const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
	const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

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
