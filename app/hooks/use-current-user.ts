import { useActionQuery } from "@agent-native/core/client/hooks";

import { can, type Capability } from "@/lib/permissions";

export function useCurrentUser() {
  const { data: me, isLoading, error } = useActionQuery("get-current-user", {});
  return {
    me,
    isLoading,
    error,
    can: (cap: Capability) => can(me?.role, cap),
  };
}
