import { appPath } from "@agent-native/core/client/api-path";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export type PathedFile = { file: File; path: string };

export type CourseDraft = {
  key: string;
  folder: string;
  title: string;
  description: string;
  category: string;
  difficulty: "Foundation" | "Intermediate" | "Advanced";
  durationMinutes: number;
  format: string;
  files: PathedFile[];
  oversize: PathedFile[];
  include: boolean;
};

const JUNK = /^(\.ds_store|thumbs\.db|desktop\.ini|\._.*|~\$.*|\.gitkeep)$/i;
const META_FILES = /^(course|metadata)\.json$/i;
const DESCRIPTION_FILES = /^(description\.txt|readme\.md|readme\.txt|summary\.txt)$/i;

const KINDS: [RegExp, string][] = [
  [/\.(mp4|mov|m4v|webm|avi|mkv)$/i, "Video"],
  [/\.(mp3|wav|m4a|aac|ogg)$/i, "Audio"],
  [/\.pdf$/i, "PDF"],
  [/\.(ppt|pptx|key|odp)$/i, "Slides"],
  [/\.(doc|docx|txt|md|rtf|odt|pages)$/i, "Document"],
  [/\.(xls|xlsx|csv|numbers|ods)$/i, "Spreadsheet"],
  [/\.(png|jpe?g|gif|webp|svg|heic)$/i, "Image"],
  [/\.(zip|rar|7z)$/i, "Archive"],
];

export function kindOf(name: string) {
  return KINDS.find(([re]) => re.test(name))?.[1] ?? "File";
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

function titleFromFolder(folder: string) {
  const cleaned = folder
    .replace(/^\s*\d+[\s._-]+/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || folder;
}

async function walk(entry: FileSystemEntry, out: PathedFile[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((ok, err) => (entry as FileSystemFileEntry).file(ok, err));
    out.push({ file, path: entry.fullPath.replace(/^\//, "") });
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries returns results in batches; keep reading until empty.
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((ok, err) => reader.readEntries(ok, err));
      if (!batch.length) break;
      for (const child of batch) await walk(child, out);
    }
  }
}

export async function filesFromDrop(dt: DataTransfer): Promise<PathedFile[]> {
  // Entries must be grabbed synchronously, before the drop event ends.
  const entries = Array.from(dt.items)
    .map((item) => item.webkitGetAsEntry())
    .filter((e): e is FileSystemEntry => !!e);
  const out: PathedFile[] = [];
  for (const entry of entries) await walk(entry, out);
  return out;
}

export function filesFromInput(list: FileList): PathedFile[] {
  return Array.from(list).map((file) => ({
    file,
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

// A dropped root folder whose children are folders treats each child as a
// course; dropping several course folders at once treats each as a course.
export async function groupIntoCourses(
  all: PathedFile[],
  defaults: { category: string },
): Promise<{ courses: CourseDraft[]; skipped: string[] }> {
  const skipped: string[] = [];
  const files = all.filter((f) => {
    const junk = f.path.split("/").some((seg) => JUNK.test(seg));
    return !junk;
  });
  const roots = new Set(files.map((f) => f.path.split("/")[0]));
  const singleRoot = roots.size === 1 && files.some((f) => f.path.split("/").length >= 3);
  const depth = singleRoot ? 1 : 0;

  const groups = new Map<string, PathedFile[]>();
  for (const f of files) {
    const segs = f.path.split("/");
    if (segs.length <= depth + 1) {
      skipped.push(f.path);
      continue;
    }
    const folder = segs[depth];
    const rel = segs.slice(depth + 1).join("/");
    const list = groups.get(folder) ?? [];
    list.push({ file: f.file, path: rel });
    groups.set(folder, list);
  }

  const courses: CourseDraft[] = [];
  for (const [folder, list] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
    const draft: CourseDraft = {
      key: folder,
      folder,
      title: titleFromFolder(folder),
      description: "",
      category: defaults.category,
      difficulty: "Foundation",
      durationMinutes: 30,
      format: "Video",
      files: [],
      oversize: [],
      include: true,
    };
    const meta = list.find((f) => !f.path.includes("/") && META_FILES.test(f.path));
    if (meta) {
      try {
        const m = JSON.parse(await meta.file.text()) as Record<string, unknown>;
        if (typeof m.title === "string" && m.title.trim()) draft.title = m.title.trim();
        if (typeof m.description === "string") draft.description = m.description;
        if (typeof m.category === "string" && m.category.trim()) draft.category = m.category.trim();
        if (m.difficulty === "Foundation" || m.difficulty === "Intermediate" || m.difficulty === "Advanced")
          draft.difficulty = m.difficulty;
        const dur = Number(m.durationMinutes ?? m.duration);
        if (Number.isFinite(dur) && dur > 0) draft.durationMinutes = Math.round(dur);
        if (typeof m.format === "string" && m.format.trim()) draft.format = m.format.trim();
      } catch {
        skipped.push(`${folder}/${meta.path} (unreadable JSON)`);
      }
    }
    if (!draft.description) {
      const desc = list.find((f) => !f.path.includes("/") && DESCRIPTION_FILES.test(f.path));
      if (desc && desc.file.size < 64 * 1024) draft.description = (await desc.file.text()).trim().slice(0, 2000);
    }
    for (const f of list) {
      if (f === meta) continue;
      (f.file.size > MAX_FILE_BYTES ? draft.oversize : draft.files).push(f);
    }
    const kinds = draft.files.map((f) => kindOf(f.path));
    if (!meta || draft.format === "Video") {
      draft.format = kinds.includes("Video") ? "Video" : kinds.includes("Slides") ? "Workshop" : "Document";
    }
    courses.push(draft);
  }
  return { courses, skipped };
}

export async function uploadOne(file: File, signal?: AbortSignal): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const body = new FormData();
      body.append("file", file, baseName(file.name));
      const res = await fetch(appPath("/_agent-native/file-upload"), {
        method: "POST",
        body,
        credentials: "include",
        signal,
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        const err = new Error(data.error || `Upload failed (${res.status})`);
        // Size, type, auth, and storage errors won't succeed on retry.
        if ([400, 401, 413, 415, 503].includes(res.status)) throw Object.assign(err, { final: true });
        throw err;
      }
      return data.url;
    } catch (e) {
      lastError = e;
      if (signal?.aborted || (e as { final?: boolean }).final) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upload failed");
}

export async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let i = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

export async function fetchStorageConfigured() {
  try {
    const res = await fetch(appPath("/_agent-native/file-upload/status"), { credentials: "include" });
    const data = (await res.json()) as { configured?: boolean };
    return !!data.configured;
  } catch {
    return false;
  }
}
