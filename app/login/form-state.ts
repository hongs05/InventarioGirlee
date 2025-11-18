export type LoginField = "email" | "password";

export type LoginFormState = {
	fieldErrors: Partial<Record<LoginField, string>>;
	formError: string | null;
};

export const initialLoginState: LoginFormState = {
	fieldErrors: {},
	formError: null,
};
