import { supabase as localSupabase } from '../supabase/client';

export const lovable = {
  auth: {
    // No-op: social auth is removed in local migration. Keep the API so imports don't break,
    // but return a clear error so callers know social OAuth isn't available.
    signInWithOAuth: async () => {
      return { error: { message: 'Social OAuth (Google) is not available in local mode' } };
    },
  },
};
