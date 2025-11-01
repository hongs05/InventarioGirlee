export type ActionErrorRecord = Record<string, string[]>;

export type ActionResult<T> =
	| { success: true; data: T; message?: string }
	| { success: false; errors: ActionErrorRecord; message?: string };
