// Local supabase-like client backed by the local server DB endpoints and local auth endpoints.
// The app uses a subset of the Supabase JS API. This file implements enough of that API
// to run entirely against the local MongoDB-backed server (no external Supabase required).

// Determine API base. Prefer Vite's import.meta.env on the client, fall back to process.env on SSR
const API_BASE = (typeof window !== 'undefined' && typeof import !== 'undefined' && (import as any).meta && (import as any).meta.env && (import as any).meta.env.VITE_API_BASE)
  ? (import as any).meta.env.VITE_API_BASE.replace(/\/+$/, '')
  : (process.env.VITE_API_BASE || '/api');

function apiPath(path: string) {
  const base = (API_BASE || '/api').replace(/\/+$/, '');
  if (!path.startsWith('/')) path = '/' + path;
  return base + path;
}

function buildQueryString(params: Record<string, any>) {
  const entries: string[] = [];
  for (const k of Object.keys(params)) {
    const v = params[k];
    if (v === undefined || v === null) continue;
    entries.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
  }
  return entries.length ? '?' + entries.join('&') : '';
}

function handleFetchResponse(res: Response) {
  return res.text().then((text) => {
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  });
}

export const supabase = {
  // auth surface (minimal, backed by /api/auth endpoints)
  auth: {
    async getSession() {
      const res = await fetch(apiPath('/auth/session'), { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      return { data: { session: json.user || null } };
    },

    async getUser() {
      const s = await this.getSession();
      return { data: { user: s.data.session ?? null } };
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { error: { message: json.error || 'Sign up failed' } };
      return { data: json };
    },

    async signOut() {
      const res = await fetch(apiPath('/auth/signout'), { method: 'POST', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { error: { message: json.error || 'Sign out failed' } };
      return { data: json };
    },

    async setSession(tokens: any) {
      // Attempt to store tokens server-side via the local auth server
      const res = await fetch(apiPath('/auth/set-session'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tokens }),
      });
      if (!res.ok) {
        const body = await handleFetchResponse(res).catch(() => null);
        throw new Error(`setSession failed: ${res.status} ${res.statusText} ${JSON.stringify(body)}`);
      }
      return { data: await res.json().catch(() => ({})) };
    },

    onAuthStateChange(cb: (event: string, session: any) => void) {
      let lastUser: any = null;
      let stopped = false;
      async function check() {
        if (stopped) return;
        try {
          const res = await fetch(apiPath('/auth/session'), { credentials: 'include' });
          const json = await res.json().catch(() => ({}));
          const user = json.user ?? null;
          if (JSON.stringify(user) !== JSON.stringify(lastUser)) {
            lastUser = user;
            try {
              cb(user ? 'SIGNED_IN' : 'SIGNED_OUT', user);
            } catch (e) {
              /* ignore callback errors */
            }
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

  // Implement a small subset of supabase.from(...).select(...).eq(...).maybeSingle() and insert/update/delete
  from(table: string) {
    // Query builder state
    const state: any = { select: '*', filters: [], order: null, limit: null };

    function toResponse(data: any, err: any = null) {
      return { data, error: err };
    }

    return {
      select(cols: string | string[]) {
        state.select = Array.isArray(cols) ? cols.join(',') : cols;
        return this;
      },
      eq(field: string, value: any) {
        state.filters.push({ op: 'eq', field, value });
        return this;
      },
      order(field: string, opts?: { ascending?: boolean }) {
        state.order = { field, ascending: opts?.ascending ?? true };
        return this;
      },
      limit(n: number) {
        state.limit = n;
        return this;
      },
      async maybeSingle() {
        try {
          // Build query params
          const params: Record<string, any> = { select: state.select, maybeSingle: 'true' };
          state.filters.forEach((f: any, i: number) => {
            if (f.op === 'eq') params[`eq_${f.field}`] = f.value;
          });
          if (state.order) params.order = `${state.order.field}:${state.order.ascending ? 'asc' : 'desc'}`;
          if (state.limit) params.limit = state.limit;

          const qs = buildQueryString(params);
          const res = await fetch(apiPath(`/db/${encodeURIComponent(table)}`) + qs, { credentials: 'include' });
          if (!res.ok) {
            const body = await handleFetchResponse(res).catch(() => null);
            return toResponse(null, { message: body || 'DB read failed' });
          }
          const data = await res.json().catch(() => null);
          return toResponse(data ?? null, null);
        } catch (e: any) {
          return toResponse(null, { message: e.message || String(e) });
        }
      },
      async selectAll() {
        // convenience: immediate fetch of all
        try {
          const qs = buildQueryString({ select: state.select });
          const res = await fetch(apiPath(`/db/${encodeURIComponent(table)}`) + qs, { credentials: 'include' });
          if (!res.ok) return toResponse(null, { message: 'DB read failed' });
          const data = await res.json().catch(() => null);
          return toResponse(data ?? [], null);
        } catch (e: any) {
          return toResponse(null, { message: e.message || String(e) });
        }
      },
      async insert(payload: any) {
        try {
          const res = await fetch(apiPath(`/db/${encodeURIComponent(table)}`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const body = await handleFetchResponse(res).catch(() => null);
            return toResponse(null, { message: body || 'DB insert failed' });
          }
          const data = await res.json().catch(() => null);
          return toResponse(data ?? null, null);
        } catch (e: any) {
          return toResponse(null, { message: e.message || String(e) });
        }
      },
      async update(payload: any) {
        try {
          // require eq filter to identify rows when updating through this simplified API
          const eq = state.filters.find((f: any) => f.op === 'eq');
          if (!eq) return toResponse(null, { message: 'No filter provided for update' });
          const res = await fetch(apiPath(`/db/${encodeURIComponent(table)}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ filter: { field: eq.field, value: eq.value }, update: payload }),
          });
          if (!res.ok) {
            const body = await handleFetchResponse(res).catch(() => null);
            return toResponse(null, { message: body || 'DB update failed' });
          }
          const data = await res.json().catch(() => null);
          return toResponse(data ?? null, null);
        } catch (e: any) {
          return toResponse(null, { message: e.message || String(e) });
        }
      },
      async delete() {
        try {
          const params: Record<string, any> = {};
          state.filters.forEach((f: any) => {
            if (f.op === 'eq') params[`eq_${f.field}`] = f.value;
          });
          const qs = buildQueryString(params);
          const res = await fetch(apiPath(`/db/${encodeURIComponent(table)}`) + qs, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!res.ok) {
            const body = await handleFetchResponse(res).catch(() => null);
            return toResponse(null, { message: body || 'DB delete failed' });
          }
          const data = await res.json().catch(() => null);
          return toResponse(data ?? null, null);
        } catch (e: any) {
          return toResponse(null, { message: e.message || String(e) });
        }
      },
    };
  },

  // rpc is not implemented for local DB; provide a clear error
  rpc() {
    throw new Error('RPC calls are not supported by the local DB adapter');
  },
} as const;
