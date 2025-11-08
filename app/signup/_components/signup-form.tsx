"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialSignupState, signupAction } from "../actions";

function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<button
			type='submit'
			disabled={pending}
			className='w-full rounded-md bg-blush-500 px-4 py-2 text-white transition hover:bg-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'>
			{pending ? "Creando cuenta…" : "Sign up"}
		</button>
	);
}

type SignupFormProps = {
	initialError?: string | null;
};

export function SignupForm({ initialError }: SignupFormProps) {
	const [state, formAction] = useActionState(
		signupAction,
		initialError
			? { ...initialSignupState, formError: initialError }
			: initialSignupState,
	);

	return (
		<form className='mt-8 space-y-6' action={formAction} noValidate>
			{state.formError ? (
				<div
					role='alert'
					aria-live='assertive'
					className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
					{state.formError}
				</div>
			) : null}

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
						aria-invalid={Boolean(state.fieldErrors.email)}
						aria-describedby={
							state.fieldErrors.email ? "signup-email-error" : undefined
						}
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blush-400 focus:outline-none focus:ring-blush-300'
					/>
					{state.fieldErrors.email ? (
						<p id='signup-email-error' className='mt-1 text-xs text-red-500'>
							{state.fieldErrors.email}
						</p>
					) : null}
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
						aria-invalid={Boolean(state.fieldErrors.password)}
						aria-describedby={
							state.fieldErrors.password ? "signup-password-error" : undefined
						}
						className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blush-400 focus:outline-none focus:ring-blush-300'
					/>
					{state.fieldErrors.password ? (
						<p id='signup-password-error' className='mt-1 text-xs text-red-500'>
							{state.fieldErrors.password}
						</p>
					) : null}
				</div>
			</div>

			<SubmitButton />

			<div className='text-center text-sm'>
				<span className='text-gray-600'>Already have an account? </span>
				<Link
					href='/login'
					className='font-medium text-blush-600 hover:text-blush-600'>
					Sign in
				</Link>
			</div>
		</form>
	);
}
