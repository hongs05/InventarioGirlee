import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseHostname = (() => {
	if (!supabaseUrl) return undefined;

	try {
		return new URL(supabaseUrl).hostname;
	} catch (error) {
		console.warn(
			"[next.config] Could not parse NEXT_PUBLIC_SUPABASE_URL for images.remotePatterns",
			error,
		);
		return undefined;
	}
})();

const remotePatterns =
	supabaseHostname !== undefined
		? [
				{
					protocol: "https" as const,
					hostname: supabaseHostname,
					pathname: "/storage/v1/object/public/**",
				},
		  ]
		: [];

const nextConfig: NextConfig = {
	images: {
		remotePatterns,
	},
};

export default nextConfig;
