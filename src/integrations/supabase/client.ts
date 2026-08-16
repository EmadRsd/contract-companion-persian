// Local auth wrapper that replaces supabase client usage in the app.
// Exposes a minimal supabase-like `auth` surface backed by the local /api/auth endpoints.
export const supabase = {
  auth: {
    async getSession() {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const json = await res.json();
      // normalize to supabase shape: { data: { session: ... } }
      return { data: { session: json.user || null } };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return { error: { message: json.error || 'Sign in failed' } };
      }
      return { data: { user: true } };
    },

    async signUp({ email, password, options }: any) {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, fullName: options?.data?.full_name }),
      });
      const json = await res.json();
      if (!res.ok) return { error: { message: json.error || 'Sign up failed' } };
      return { data: json };
    },

    async signOut() {
      const res = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { error: { message: json.error || 'Sign out failed' } };
      return { data: json };
    },

    onAuthStateChange(cb: (event: string, session: any) => void) {
      let lastUser: any = null;
      let stopped = false;
      async function check() {
        if (stopped) return;
        try {
          const res = await fetch('/api/auth/session', { credentials: 'include' });
          const json = await res.json();
          const user = json.user ?? null;
          if (JSON.stringify(user) !== JSON.stringify(lastUser)) {
            lastUser = user;
            try { cb('SESSION', user); } catch(e) { /* ignore */ }
          }
        } catch (e) {
          // ignore network errors
        }
        if (!stopped) setTimeout(check, 2000);
      }
      check();
      const subscription = { unsubscribe() { stopped = true; } };
      return { data: { subscription }, error: null };
    },
  },
} as const;
