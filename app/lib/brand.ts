const cdn = (id: string, width = 800) =>
  `https://cdn.builder.io/api/v1/image/assets%2F6a86dc2ea12441c896975357926a568c%2F${id}?format=webp&width=${width}`;

export const BRAND = {
  appName: "Twelve Stone Academy",
  descriptor: "Training & Development Hub",
  parent: "Twelve Stone Digital",
  tagline: "Marketing built on solid ground.",
  assistantName: "Stone Guide",
  logos: {
    // Approved artwork on dark grounds; blended onto charcoal surfaces.
    lockupOnDark: cdn("4d7566ca72bd4425ad75347e994bc852", 800),
    markOnDark: cdn("a2cbe701b3ea49a5bacbbd14724affec", 400),
  },
  imagery: {
    foundation: cdn("24cd000f0ccf45aca6531d5588867ffc", 1600),
  },
} as const;

export function formatDate(d: string | null | undefined) {
  if (!d) return "No due date";
  return new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(a: { dueDate: string | null; status: string }) {
  return a.status !== "completed" && !!a.dueDate && a.dueDate < todayISO();
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export const CATEGORIES = [
  "Onboarding",
  "SEO",
  "Paid Media",
  "Analytics",
  "Content",
  "Client Services",
  "Operations",
  "Compliance",
];

export const DIFFICULTIES = ["Foundation", "Intermediate", "Advanced"] as const;
