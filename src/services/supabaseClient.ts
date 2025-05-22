import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "VITE_SUPABASE_URL is not defined in your environment variables."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY is not defined in your environment variables."
  );
}

// This type can be expanded with your actual database schema if you generate types from Supabase
// For now, 'any' is used for simplicity, but you can generate types via `npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts`
export type TypedSupabaseClient = SupabaseClient<any, "public", any>; // Replace 'any' with your Database type from generated types

/**
 * A public Supabase client instance that can be used for operations that do not require authentication.
 */
export const publicSupabaseClient: TypedSupabaseClient = createClient<
  any,
  "public",
  any
>(supabaseUrl, supabaseAnonKey); // Replace 'any' with your Database type

// Example of how you might generate and use Supabase types (optional but recommended):
// 1. Install supabase CLI: npm install supabase --save-dev (or global)
// 2. Login: npx supabase login
// 3. Link project: npx supabase link --project-ref <your-project-ref-from-supabase-url>
// 4. Generate types: npx supabase gen types typescript --linked > src/types/supabase.ts (or your preferred path)
// 5. Import your Database type in this file: import { Database } from '../types/supabase'; (adjust path)
// 6. Use it in TypedSupabaseClient: export type TypedSupabaseClient = SupabaseClient<Database, "public">;
// 7. And in createClient calls: createClient<Database, "public">(...);
