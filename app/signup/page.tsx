import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";

import { SignupForm } from "./_components/signup-form";

type SignupPageProps = {
	searchParams?: Record<string, string | string[] | undefined>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		redirect("/dashboard");
	}

	const initialError =
		typeof searchParams?.error === "string"
			? decodeURIComponent(searchParams.error)
			: null;

	return (
		<div className='flex min-h-screen items-center justify-center bg-blush-50'>
			<div className='w-full max-w-md space-y-8 rounded-lg border border-blush-100 bg-white p-8 shadow-md'>
				<div>
					<h2 className='text-center text-3xl font-bold tracking-tight text-gray-900'>
						Create your account
					</h2>
				</div>
				<SignupForm initialError={initialError} />
			</div>
		</div>
	);
}
