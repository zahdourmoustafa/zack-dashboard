import { createClient } from '@supabase/supabase-js';

// Ensure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is not defined. Please check your .env file.");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not defined. Please check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 