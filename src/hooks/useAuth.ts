import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/clm";

export interface SessionInfo {
  userId: string | null;
  email: string | null;
  fullName: string | null;
  roles: AppRole[];
}

export function useAuth() {
  const query = useQuery<SessionInfo>({
    queryKey: ["session-info"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return { userId: null, email: null, fullName: null, roles: [] };

      // Normalize user id (support different shapes)
      const userId = user.id ?? user.sub ?? user.user_id ?? user.uid ?? null;

      // Fetch profile (if present). If profiles table doesn't exist or is empty, fall back to JWT/email.
      const [{ data: profile }, rolesResult] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
        // Only fetch user_roles table if roles are not provided in the JWT payload
        (async () => {
          if (Array.isArray(user.roles) && user.roles.length > 0) return { data: user.roles.map((r: any) => ({ role: r })) };
          const res = await supabase.from("user_roles").select("role").eq("user_id", userId);
          return res;
        })(),
      ] as any);

      const rolesArray: AppRole[] = (Array.isArray(user.roles) && user.roles.length > 0)
        ? (user.roles as AppRole[])
        : ((rolesResult?.data ?? []).map((r: any) => r.role as AppRole) as AppRole[]);

      return {
        userId: userId ?? null,
        email: profile?.email ?? user.email ?? null,
        fullName: profile?.full_name ?? user.email ?? null,
        roles: rolesArray ?? [],
      };
    },
  });

  return {
    ...(query.data ?? { userId: null, email: null, fullName: null, roles: [] as AppRole[] }),
    isLoading: query.isLoading,
  };
}
