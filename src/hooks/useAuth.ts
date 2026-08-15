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

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      return {
        userId: user.id,
        email: profile?.email ?? user.email ?? null,
        fullName: profile?.full_name ?? user.email ?? null,
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
    },
  });

  return {
    ...(query.data ?? { userId: null, email: null, fullName: null, roles: [] as AppRole[] }),
    isLoading: query.isLoading,
  };
}
