import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";

import { LoginForm } from "./_components/login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type LoginPageProps = {
	searchParams?: Record<string, string | string[] | undefined>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		redirect("/dashboard");
	}

	const successMessage =
		typeof searchParams?.message === "string"
			? decodeURIComponent(searchParams.message)
			: null;
	const initialError =
		typeof searchParams?.error === "string"
			? decodeURIComponent(searchParams.error)
			: null;

	return (
		<div className='flex min-h-screen items-center justify-center bg-blush-50'>
			<div className='w-full max-w-md space-y-8 rounded-lg border border-blush-100 bg-white p-8 shadow-md'>
				<div>
					<h2 className='text-center text-3xl font-bold tracking-tight text-gray-900'>
						Sign in to your account
					</h2>
				</div>
				<LoginForm message={successMessage} initialError={initialError} />
			</div>
		</div>
	);
}
