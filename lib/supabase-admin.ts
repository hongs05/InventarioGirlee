import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase helpers operate on multiple tables without generated types.
export type SupabaseAdminClient = SupabaseClient<any>;

export class MissingEnvironmentVariableError extends Error {
	constructor(public readonly envVar: string) {
		super(`Missing required environment variable: ${envVar}`);
		this.name = "MissingEnvironmentVariableError";
	}
}

function getEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new MissingEnvironmentVariableError(name);
	}
	return value;
}

export function createSupabaseAdminClient(): SupabaseAdminClient {
	const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
	const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

	return createClient<unknown>(url, serviceRoleKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}
