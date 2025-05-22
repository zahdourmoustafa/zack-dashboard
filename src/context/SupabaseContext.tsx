import React, { createContext, useContext, useMemo, ReactNode } from "react";
// import { useAuth } from "@clerk/clerk-react";
import {
  getSupabaseClient,
  TypedSupabaseClient,
  publicSupabaseClient,
} from "@/services/supabaseClient"; // Adjust path if necessary

interface SupabaseContextType {
  supabase: TypedSupabaseClient;
  isLoading: boolean; // Indicates if Clerk auth is still loading
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  // const { getToken, isSignedIn, isLoaded } = useAuth();

  // Memoize the client. It will re-initialize if isSignedIn or getToken changes.
  // The `getSupabaseClient` function itself returns a new client instance, so the dependency on `getToken` is important.
  // const authenticatedSupabaseClient = useMemo(() => {
  //   if (isSignedIn && getToken) {
  //     return getSupabaseClient(getToken);
  //   }
  //   return null; // No authenticated client if not signed in or token not available
  // }, [isSignedIn, getToken]);

  // If not signed in, or Clerk is still loading, provide the public client.
  // Once signed in, provide the authenticated client.
  // const clientToProvide = authenticatedSupabaseClient || publicSupabaseClient;

  const value = {
    supabase: publicSupabaseClient, // Always use public client
    isLoading: false, // No longer depends on Clerk's loading state
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = (): SupabaseContextType => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};
