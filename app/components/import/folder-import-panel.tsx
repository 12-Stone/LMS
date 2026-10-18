import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconAlertTriangle, IconCheck, IconFolderOpen, IconLoader2, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { ProgressBar } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, DIFFICULTIES } from "@/lib/brand";
import {
  type CourseDraft,
  type PathedFile,
  fetchStorageConfigured,
  filesFromDrop,
  filesFromInput,
  formatBytes,
  groupIntoCourses,
  kindOf,
  runPool,
  uploadOne,
} from "@/lib/folder-import";
import { cn } from "@/lib/utils";

type Progress = {
  state: "waiting" | "uploading" | "saving" | "done" | "failed" | "cancelled";
  uploaded: number;
  total: number;
  failedFiles: string[];
  error?: string;
};

const sizeOf = (files: PathedFile[]) => files.reduce((s, f) => s + f.file.size, 0);

export function FolderImportPanel() {
  const { data: buckets = [] } = useActionQuery("list-buckets", {});
  const importCourse = useActionMutation("import-course-folder");
  const [storageReady, setStorageReady] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [drafts, setDrafts] = useState<CourseDraft[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [bucketId, setBucketId] = useState("none");
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStorageConfigured().then(setStorageReady);
  }, []);

  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const ingest = async (files: PathedFile[]) => {
    if (!files.length) return;
    setScanning(true);
    try {
      const { courses, skipped: s } = await groupIntoCourses(files, { category });
      setDrafts(courses);
      setSkipped(s);
      setProgress({});
    } finally {
      setScanning(false);
    }
  };

  const patch = (key: string, p: Partial<CourseDraft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...p } : d)));
  const setProg = (key: string, p: Partial<Progress>) =>
    setProgress((all) => ({ ...all, [key]: { ...all[key], ...p } as Progress }));

  const included = drafts.filter((d) => d.include);
  const totalFiles = included.reduce((s, d) => s + d.files.length, 0);
  const totalBytes = included.reduce((s, d) => s + sizeOf(d.files), 0);
  const oversizeCount = included.reduce((s, d) => s + d.oversize.length, 0);
  const uploadedFiles = Object.values(progress).reduce((s, p) => s + (p?.uploaded ?? 0), 0);
  const doneCount = Object.values(progress).filter((p) => p?.state === "done").length;
  const failed = drafts.filter((d) => progress[d.key]?.state === "failed" || progress[d.key]?.state === "cancelled");
  const finished = !running && Object.keys(progress).length > 0;

  const run = async (targets: CourseDraft[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    for (const d of targets) setProg(d.key, { state: "waiting", uploaded: 0, total: d.files.length, failedFiles: [] });

    for (const d of targets) {
      if (controller.signal.aborted) {
        setProg(d.key, { state: "cancelled" });
        continue;
      }
      setProg(d.key, { state: "uploading" });
      const uploaded: { name: string; path: string; kind: string; mimeType: string; sizeBytes: number; url: string }[] = [];
      const failedFiles: string[] = [];
      await runPool(d.files, 4, async (f) => {
        if (controller.signal.aborted) return;
        try {
          const url = await uploadOne(f.file, controller.signal);
          uploaded.push({
            name: f.path.split("/").pop() ?? f.path,
            path: f.path,
            kind: kindOf(f.path),
            mimeType: f.file.type,
            sizeBytes: f.file.size,
            url,
          });
          setProgress((all) => ({ ...all, [d.key]: { ...all[d.key], uploaded: uploaded.length } }));
        } catch (e) {
          if (!controller.signal.aborted) failedFiles.push(`${f.path}: ${(e as Error).message}`);
        }
      });
      if (controller.signal.aborted) {
        setProg(d.key, { state: "cancelled", failedFiles });
        continue;
      }
      if (d.files.length && !uploaded.length) {
        setProg(d.key, { state: "failed", failedFiles, error: "No files could be uploaded." });
        continue;
      }
      setProg(d.key, { state: "saving", failedFiles });
      try {
        await importCourse.mutateAsync({
          title: d.title,
          description: d.description || undefined,
          category: d.category,
          difficulty: d.difficulty,
          durationMinutes: d.durationMinutes,
          format: d.format,
          status,
          bucketId: bucketId === "none" ? undefined : bucketId,
          resources: uploaded.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true })),
        });
        setProg(d.key, { state: "done", failedFiles });
        // Imported courses shouldn't be re-created by "Retry failed".
        patch(d.key, { include: false });
      } catch (e) {
        setProg(d.key, { state: "failed", failedFiles, error: (e as Error).message });
      }
    }
    setRunning(false);
    abortRef.current = null;
  };

  if (storageReady === false) {
    return (
      <div className="flex gap-3 rounded-[4px] border border-destructive/30 bg-destructive/5 p-5 text-sm">
        <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
        <div>
          <p className="font-medium">File storage isn't connected yet.</p>
          <p className="mt-1 text-muted-foreground">
            Course files need somewhere durable to live before they can be uploaded. Connect Builder.io file hosting or
            another storage provider, then return to this page. Spreadsheet import still works without storage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!running) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragging(false);
          if (running) return;
          await ingest(await filesFromDrop(e.dataTransfer));
        }}
        className={cn(
          "tsd-pattern flex flex-col items-center justify-center gap-4 rounded-[4px] bg-tsd-charcoal px-6 py-14 text-center text-tsd-limestone transition-[outline]",
          dragging && "outline outline-2 outline-offset-4 outline-tsd-gold",
        )}
      >
        {scanning ? (
          <IconLoader2 size={32} className="animate-spin text-tsd-gold" />
        ) : (
          <IconFolderOpen size={32} stroke={1.25} className="text-tsd-gold" />
        )}
        <div>
          <p className="font-display text-3xl">{scanning ? "Reading folders…" : "Drop your course library here"}</p>
          <p className="mx-auto mt-2 max-w-[560px] text-sm text-tsd-limestone/75">
            Drop one parent folder that holds a folder per course, or several course folders at once. Every file in a
            course folder, including subfolders, is attached to that course as a resource.
          </p>
        </div>
        <Button
          className="h-11 bg-tsd-gold text-tsd-charcoal hover:bg-tsd-gold/90"
          disabled={running || scanning}
          onClick={() => inputRef.current?.click()}
        >
          Choose folder
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          // @ts-expect-error non-standard folder picker attributes
          webkitdirectory=""
          directory=""
          onChange={async (e) => {
            if (e.target.files) await ingest(filesFromInput(e.target.files));
            e.target.value = "";
          }}
        />
        <p className="text-xs text-tsd-limestone/60">
          Optional per course: a <code>course.json</code> with title, description, category, difficulty, durationMinutes,
          and format, or a <code>description.txt</code> / <code>README.md</code> for the description. Files over 25 MB are
          skipped.
        </p>
      </div>

      {drafts.length > 0 && (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <Summary label="Courses" value={`${included.length} of ${drafts.length}`} />
              <Summary label="Files" value={totalFiles.toLocaleString()} />
              <Summary label="Total size" value={formatBytes(totalBytes)} />
              <Summary label="Skipped" value={(oversizeCount + skipped.length).toLocaleString()} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="space-y-1.5">
                <Label>Default category for new rows</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setCategory(v);
                    setDrafts((ds) => ds.map((d) => ({ ...d, category: v })));
                  }}
                  disabled={running}
                >
                  <SelectTrigger className="h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Publish status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)} disabled={running}>
                  <SelectTrigger className="h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Import as drafts for review</SelectItem>
                    <SelectItem value="published">Publish immediately</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Add to training bucket</Label>
                <Select value={bucketId} onValueChange={setBucketId} disabled={running}>
                  <SelectTrigger className="h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Don't add to a bucket</SelectItem>
                    {buckets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {Object.keys(progress).length > 0 && (
            <div className="rounded-[4px] bg-secondary p-5">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {running
                    ? `Uploading ${uploadedFiles.toLocaleString()} of ${Object.values(progress)
                        .reduce((s, p) => s + (p?.total ?? 0), 0)
                        .toLocaleString()} files`
                    : `${doneCount} ${doneCount === 1 ? "course" : "courses"} imported${failed.length ? `, ${failed.length} not completed` : ""}.`}
                </span>
                {finished && doneCount > 0 && (
                  <Link to="/courses" className="font-medium underline underline-offset-4">
                    Open the library
                  </Link>
                )}
              </div>
              <ProgressBar
                className="bg-background"
                value={
                  (uploadedFiles / Math.max(1, Object.values(progress).reduce((s, p) => s + (p?.total ?? 0), 0))) * 100
                }
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Keep this tab open until the import finishes. Courses are saved one at a time, so anything finished stays
                saved if you stop.
              </p>
            </div>
          )}

          <div className="overflow-x-auto rounded-[4px] bg-card">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="w-44 px-4 py-3 font-medium">Category</th>
                  <th className="w-40 px-4 py-3 font-medium">Difficulty</th>
                  <th className="w-24 px-4 py-3 font-medium">Minutes</th>
                  <th className="w-32 px-4 py-3 font-medium">Files</th>
                  <th className="w-40 px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drafts.map((d) => {
                  const p = progress[d.key];
                  const locked = running || p?.state === "done";
                  return (
                    <tr key={d.key} className={cn(!d.include && !p && "opacity-50")}>
                      <td className="px-4 py-3 align-top">
                        <Checkbox
                          checked={d.include}
                          disabled={locked}
                          onCheckedChange={(v) => patch(d.key, { include: !!v })}
                          aria-label={`Include ${d.title}`}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Input
                          value={d.title}
                          disabled={locked}
                          onChange={(e) => patch(d.key, { title: e.target.value })}
                          className="h-10"
                          aria-label="Course title"
                        />
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Folder: {d.folder}
                          {d.description ? " · description found" : ""}
                        </p>
                        {d.oversize.length > 0 && (
                          <p className="mt-1 text-xs text-destructive">
                            {d.oversize.length} {d.oversize.length === 1 ? "file is" : "files are"} over 25 MB and will be
                            skipped: {d.oversize.map((f) => f.path).slice(0, 3).join(", ")}
                            {d.oversize.length > 3 ? "…" : ""}
                          </p>
                        )}
                        {p?.failedFiles?.length ? (
                          <p className="mt-1 text-xs text-destructive">
                            {p.failedFiles.length} {p.failedFiles.length === 1 ? "file" : "files"} failed:{" "}
                            {p.failedFiles.slice(0, 2).join("; ")}
                          </p>
                        ) : null}
                        {p?.error && <p className="mt-1 text-xs text-destructive">{p.error}</p>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Select value={d.category} disabled={locked} onValueChange={(v) => patch(d.key, { category: v })}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[...new Set([...CATEGORIES, d.category])].map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Select
                          value={d.difficulty}
                          disabled={locked}
                          onValueChange={(v) => patch(d.key, { difficulty: v as CourseDraft["difficulty"] })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTIES.map((x) => (
                              <SelectItem key={x} value={x}>
                                {x}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Input
                          type="number"
                          min={1}
                          value={d.durationMinutes}
                          disabled={locked}
                          onChange={(e) => patch(d.key, { durationMinutes: Math.max(1, Number(e.target.value) || 1) })}
                          className="h-10"
                          aria-label="Duration in minutes"
                        />
                      </td>
                      <td className="px-4 py-3 align-top tabular-nums">
                        {d.files.length}
                        <span className="block text-xs text-muted-foreground">{formatBytes(sizeOf(d.files))}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <RowStatus p={p} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {skipped.length > 0 && (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer">
                {skipped.length} {skipped.length === 1 ? "file" : "files"} outside a course folder will not be imported
              </summary>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {skipped.slice(0, 50).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-wrap gap-3">
            {running ? (
              <Button variant="outline" className="h-12" onClick={() => abortRef.current?.abort()}>
                <IconX size={16} /> Stop after current files
              </Button>
            ) : (
              <>
                <Button
                  className="h-12 px-6"
                  disabled={!included.length || storageReady !== true}
                  onClick={() => run(included)}
                >
                  Import {included.length} {included.length === 1 ? "course" : "courses"} ({formatBytes(totalBytes)})
                </Button>
                {failed.length > 0 && (
                  <Button variant="outline" className="h-12" onClick={() => run(failed)}>
                    Retry {failed.length} not completed
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="h-12"
                  onClick={() => {
                    setDrafts([]);
                    setSkipped([]);
                    setProgress({});
                  }}
                >
                  Clear
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-tsd-gold/70 pl-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RowStatus({ p }: { p?: Progress }) {
  if (!p) return <span className="text-xs text-muted-foreground">Ready</span>;
  switch (p.state) {
    case "waiting":
      return <span className="text-xs text-muted-foreground">Waiting</span>;
    case "uploading":
      return (
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-xs">
            <IconLoader2 size={12} className="animate-spin" /> {p.uploaded}/{p.total} files
          </span>
          <ProgressBar value={(p.uploaded / Math.max(1, p.total)) * 100} />
        </div>
      );
    case "saving":
      return (
        <span className="flex items-center gap-1.5 text-xs">
          <IconLoader2 size={12} className="animate-spin" /> Saving course
        </span>
      );
    case "done":
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#3d5a40] dark:text-tsd-sage">
          <IconCheck size={14} /> Imported
        </span>
      );
    case "cancelled":
      return <span className="text-xs text-muted-foreground">Stopped</span>;
    default:
      return <span className="text-xs font-medium text-destructive">Failed</span>;
  }
}
