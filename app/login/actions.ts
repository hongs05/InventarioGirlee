"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { LoginFormState } from "./form-state";

const loginSchema = z.object({
	email: z
		.string({ required_error: "Ingresa tu correo electrónico" })
		.email("Ingresa un correo válido"),
	password: z
		.string({ required_error: "Ingresa tu contraseña" })
		.min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function loginAction(
	_prevState: LoginFormState,
	formData: FormData,
): Promise<LoginFormState> {
	const parsed = loginSchema.safeParse({
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
		};
	}

	try {
		const supabase = await createSupabaseServerClient();
		const { error } = await supabase.auth.signInWithPassword(parsed.data);

		if (error) {
			return {
				fieldErrors: {},
				formError:
					error.message || "Credenciales inválidas. Intenta nuevamente.",
			};
		}
	} catch (error) {
		console.error("[loginAction]", error);
		return {
			fieldErrors: {},
			formError: "No pudimos iniciar sesión. Intenta más tarde.",
		};
	}

	redirect("/dashboard");
}
