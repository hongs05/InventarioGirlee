import { webcrypto } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

if (typeof globalThis.crypto === "undefined") {
	globalThis.crypto = webcrypto as unknown as Crypto;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["lib/**/*.test.ts", "lib/**/*.spec.ts"],
		setupFiles: ["./vitest.setup.ts"],
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "."),
		},
	},
});
