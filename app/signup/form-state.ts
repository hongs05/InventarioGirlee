export type SignupField = "email" | "password";

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
