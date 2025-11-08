"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";

const signupSchema = z.object({
	email: z
		.string({ required_error: "Ingresa tu correo electrónico" })
		.email("Ingresa un correo válido"),
	password: z
		.string({ required_error: "Crea una contraseña" })
		.min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type SignupField = "email" | "password";

export type SignupFormState = {
	fieldErrors: Partial<Record<SignupField, string>>;
	formError: string | null;
	formSuccess: string | null;
};

export const initialSignupState: SignupFormState = {
	fieldErrors: {},
	formError: null,
	formSuccess: null,
};

export async function signupAction(
	_prevState: SignupFormState,
	formData: FormData,
): Promise<SignupFormState> {
	const parsed = signupSchema.safeParse({
		email: formData.get("email"),
		password: formData.get("password"),
	});

	if (!parsed.success) {
		const { fieldErrors, formErrors } = parsed.error.flatten();
		return {
			fieldErrors: {
				email: fieldErrors.email?.[0],
				password: fieldErrors.password?.[0],
			},
			formError: formErrors[0] ?? null,
			formSuccess: null,
		};
	}

	try {
		const supabase = await createSupabaseServerClient();
		const { error } = await supabase.auth.signUp(parsed.data);

		if (error) {
			return {
				fieldErrors: {},
				formError:
					error.message || "No pudimos crear la cuenta. Intenta nuevamente.",
				formSuccess: null,
			};
		}
	} catch (error) {
		console.error("[signupAction]", error);
		return {
			fieldErrors: {},
			formError: "No pudimos crear la cuenta. Intenta más tarde.",
			formSuccess: null,
		};
	}

	redirect(
		"/login?message=" +
			encodeURIComponent("Revisa tu correo para confirmar la cuenta"),
	);
}
