import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SignupPage() {
	const supabase = await createSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		redirect("/dashboard");
	}

	async function signup(formData: FormData) {
		"use server";

		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		const supabase = await createSupabaseServerClient();
		const { error } = await supabase.auth.signUp({
			email,
			password,
		});

		if (error) {
			const errorMessage = encodeURIComponent(
				error.message || "Could not create account",
			);
			redirect(`/signup?error=${errorMessage}`);
		}

		redirect("/login?message=Check your email to confirm your account");
	}

	return (
		<div className='flex min-h-screen items-center justify-center bg-gray-100'>
			<div className='w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md'>
				<div>
					<h2 className='text-center text-3xl font-bold tracking-tight text-gray-900'>
						Create your account
					</h2>
				</div>
				<form className='mt-8 space-y-6' action={signup}>
					<div className='space-y-4'>
						<div>
							<label
								htmlFor='email'
								className='block text-sm font-medium text-gray-700'>
								Email address
							</label>
							<input
								id='email'
								name='email'
								type='email'
								autoComplete='email'
								required
								className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500'
							/>
						</div>
						<div>
							<label
								htmlFor='password'
								className='block text-sm font-medium text-gray-700'>
								Password
							</label>
							<input
								id='password'
								name='password'
								type='password'
								autoComplete='new-password'
								required
								minLength={6}
								className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500'
							/>
						</div>
					</div>

					<div>
						<button
							type='submit'
							className='w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'>
							Sign up
						</button>
					</div>

					<div className='text-center text-sm'>
						<span className='text-gray-600'>Already have an account? </span>
						<Link
							href='/login'
							className='font-medium text-blue-600 hover:text-blue-500'>
							Sign in
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}
