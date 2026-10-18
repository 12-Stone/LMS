// The only administrator. Everyone else is added by this account.
export const ADMIN_EMAIL = "brady@twelvestonedigital.com";

export const ROLES = ["learner", "manager", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ASSIGNABLE_ROLES = ["learner", "manager"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isAdminEmail(email: string | null | undefined) {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}

export const ROLE_LABELS: Record<Role, string> = {
  learner: "Learner",
  manager: "Manager",
  admin: "Administrator",
};

export const CAPABILITIES = {
  "view-team": ["manager", "admin"],
  "manage-buckets": ["manager", "admin"],
  "manage-sops": ["manager", "admin"],
  "manage-courses": ["admin"],
  "manage-people": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: string | null | undefined, cap: Capability) {
  return !!role && (CAPABILITIES[cap] as readonly string[]).includes(role);
}

// Pages not listed are open to every signed-in user.
export const ROUTE_CAPABILITY: Record<string, Capability> = {
  "/buckets": "manage-buckets",
  "/analytics": "view-team",
  "/people": "view-team",
  "/import": "manage-courses",
  "/admin": "manage-people",
};
