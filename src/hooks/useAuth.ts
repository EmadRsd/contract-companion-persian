import { useQuery } from "@tanstack/react-query";
import { meFn } from "@/lib/api.functions";
import { getToken } from "@/lib/session";
import type { AppRole, UserDTO } from "@/lib/types";

export interface SessionInfo {
  userId: string | null;
  username: string | null;
  email: string | null;
  fullName: string | null;
  isRoot: boolean;
  roles: AppRole[];
}

const empty: SessionInfo = {
  userId: null,
  username: null,
  email: null,
  fullName: null,
  isRoot: false,
  roles: [],
};

export function useAuth() {
  const query = useQuery<SessionInfo>({
    queryKey: ["session-info"],
    retry: false,
    queryFn: async () => {
      if (!getToken()) return empty;
      const user = (await meFn()) as UserDTO;
      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        isRoot: user.is_root,
        roles: user.roles,
      };
    },
  });

  return { ...(query.data ?? empty), isLoading: query.isLoading };
}
