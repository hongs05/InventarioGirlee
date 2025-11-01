import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="container mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-8">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Inventario Girlee
          </h1>
          <p className="text-xl text-gray-600">
            Next.js + Supabase Boilerplate
          </p>
        </div>

        <div className="mb-12 max-w-2xl">
          <p className="text-lg leading-relaxed text-gray-700">
            A modern web application starter template built with Next.js 16 (App Router),
            Supabase for authentication and database, TypeScript, and Tailwind CSS.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg border-2 border-blue-600 bg-white px-8 py-3 text-lg font-semibold text-blue-600 shadow-lg transition hover:bg-blue-50"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2 text-xl font-semibold text-gray-900">Next.js 16</h3>
            <p className="text-gray-600">
              Latest App Router with Server Components and Server Actions
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2 text-xl font-semibold text-gray-900">Supabase</h3>
            <p className="text-gray-600">
              Authentication, database, and real-time capabilities
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2 text-xl font-semibold text-gray-900">TypeScript</h3>
            <p className="text-gray-600">
              Type-safe development with full TypeScript support
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
