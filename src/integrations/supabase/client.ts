// Local auth wrapper that replaces supabase client usage in the app.
// Exposes a minimal supabase-like `auth` surface backed by the local auth endpoints.

// Use VITE_API_BASE when available so client can call the correct origin in dev.
const API_BASE = (typeof import !== 'undefined' && typeof (import as any).meta !== 'undefined' && (import as any).meta.env && (import as any).meta.env.VITE_API_BASE)
  ? (import as any).meta.env.VITE_API_BASE
  : (process.env.VITE_API_BASE || '/api');

function apiPath(path: string) {
  const base = (API_BASE || '/api').replace(/\/+$/, '');
  if (!path.startsWith('/')) path = '/' + path;
  return base + path;
}

export const supabase = {
  auth: {
    async getSession() {
      const res = await fetch(apiPath('/auth/session'), { credentials: 'include' });
      const json = await res.json();
      // normalize to supabase shape: { data: { session: ... } }
      return { data: { session: json.user || null } };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const res = await fetch(apiPath('/auth/signin'), {
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
      const res = await fetch(apiPath('/auth/users'), {
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
      const res = await fetch(apiPath('/auth/signout'), {
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
          const res = await fetch(apiPath('/auth/session'), { credentials: 'include' });
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
