import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { IconFileUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { Link } from "react-router";

import { Page, PageHeader } from "@/components/brand/brand";
import { FolderImportPanel } from "@/components/import/folder-import-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RequireCapability } from "@/components/brand/require-capability";
import { BRAND, DIFFICULTIES } from "@/lib/brand";

export function meta() {
  return [{ title: `Bulk Import Studio · ${BRAND.appName}` }];
}

const SAMPLE = `title,category,difficulty,duration,format,description
Keyword Research Workflow,SEO,Intermediate,45,Video,How we build and prioritise keyword maps
Landing Page QA Checklist,Operations,Foundation,20,Document,Pre-launch checks for every landing page
Google Ads Bidding Strategies,Paid Media,Advanced,60,Video,Choosing and monitoring automated bidding`;

type Difficulty = (typeof DIFFICULTIES)[number];
type Row = {
  title: string;
  category: string;
  difficulty: Difficulty;
  durationMinutes: number;
  format: string;
  description: string;
  errors: string[];
};

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"' && quoted) {
      cur += '"';
      i++;
    } else if (ch === '"') quoted = !quoted;
    else if ((ch === "," || ch === "\t") && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parse(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const first = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = first.includes("title");
  const cols = hasHeader ? first : ["title", "category", "difficulty", "duration", "format", "description"];
  const idx = (name: string) => cols.findIndex((c) => c.startsWith(name));
  return lines.slice(hasHeader ? 1 : 0).map((line) => {
    const cells = splitCsvLine(line);
    const get = (name: string) => (idx(name) >= 0 ? cells[idx(name)] ?? "" : "");
    const rawDiff = get("difficulty") || "Foundation";
    const difficulty = DIFFICULTIES.find((d) => d.toLowerCase() === rawDiff.toLowerCase());
    const duration = Number.parseInt(get("duration") || "30", 10);
    const errors: string[] = [];
    if (!get("title")) errors.push("Missing title");
    if (!get("category")) errors.push("Missing category");
    if (!difficulty) errors.push(`Unknown difficulty "${rawDiff}"`);
    if (!Number.isFinite(duration) || duration <= 0) errors.push("Duration must be a positive number");
    return {
      title: get("title"),
      category: get("category"),
      difficulty: difficulty ?? "Foundation",
      durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : 30,
      format: get("format") || "Video",
      description: get("description"),
      errors,
    };
  });
}

export default function ImportRoute() {
  return (
    <RequireCapability cap="manage-courses">
      <ImportRouteContent />
    </RequireCapability>
  );
}

function ImportRouteContent() {
  const [tab, setTab] = useState("folders");
  return (
    <Page>
      <PageHeader
        eyebrow="Bulk Import Studio"
        title="Bring your training"
        emphasis="together."
        description="Upload, organize, and prepare your existing courses without rebuilding them one at a time."
      />
      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList>
          <TabsTrigger value="folders">Course folders</TabsTrigger>
          <TabsTrigger value="sheet">Spreadsheet</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="pt-6">{tab === "folders" ? <FolderImportPanel /> : <SpreadsheetImport />}</div>
    </Page>
  );
}

function SpreadsheetImport() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [bucketId, setBucketId] = useState("none");
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: buckets = [] } = useActionQuery("list-buckets", {});
  const importMut = useActionMutation("bulk-import-courses");

  const rows = parse(text);
  const valid = rows.filter((r) => !r.errors.length);
  const invalid = rows.length - valid.length;

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="csv" className="text-sm font-medium">
              Paste a spreadsheet or CSV
            </Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE)}>
                Use sample
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <IconFileUpload size={16} /> Upload .csv
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,text/csv,text/plain"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setText(await f.text());
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <Textarea
            id="csv"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDone(null);
            }}
            placeholder="title, category, difficulty, duration, format, description"
            className="min-h-44 bg-card font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Columns: title, category, difficulty (Foundation, Intermediate, Advanced), duration in minutes, format,
            description. A header row is optional. Tab-separated rows pasted from a spreadsheet also work.
          </p>
        </section>

        <aside className="space-y-5 rounded-[4px] bg-secondary p-6">
          <h2 className="font-display text-2xl font-medium">Import settings</h2>
          <div className="space-y-1.5">
            <Label>Publish status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
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
            <Select value={bucketId} onValueChange={setBucketId}>
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
          <div className="border-t border-border pt-4 text-sm">
            <p>
              <span className="font-semibold tabular-nums">{valid.length}</span> ready to import
            </p>
            {invalid > 0 && (
              <p className="text-destructive">
                <span className="font-semibold tabular-nums">{invalid}</span> {invalid === 1 ? "row needs" : "rows need"}{" "}
                attention and will be skipped
              </p>
            )}
          </div>
          <Button
            className="h-12 w-full"
            disabled={!valid.length || importMut.isPending}
            onClick={() =>
              importMut.mutate(
                {
                  courses: valid.map(({ errors: _e, ...r }) => r),
                  status,
                  bucketId: bucketId === "none" ? undefined : bucketId,
                },
                {
                  onSuccess: (r) => {
                    setDone(`${r.imported} ${r.imported === 1 ? "course was" : "courses were"} added to the library.`);
                    setText("");
                  },
                },
              )
            }
          >
            {importMut.isPending ? "Importing…" : `Import ${valid.length || ""} ${valid.length === 1 ? "course" : "courses"}`}
          </Button>
          {done && (
            <p role="status" className="text-sm">
              {done}{" "}
              <Link to="/courses" className="font-medium underline underline-offset-4">
                Open the library
              </Link>
            </p>
          )}
          {importMut.error && <p className="text-sm text-destructive">The import failed. Check the rows and try again.</p>}
        </aside>
      </div>

      {rows.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-2xl font-medium">Preview</h2>
          <div className="overflow-x-auto rounded-[4px] bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Format</th>
                  <th className="px-4 py-3 font-medium">Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className={r.errors.length ? "bg-destructive/5" : ""}>
                    <td className="px-4 py-3 font-medium">{r.title || "—"}</td>
                    <td className="px-4 py-3">{r.category || "—"}</td>
                    <td className="px-4 py-3">{r.difficulty}</td>
                    <td className="px-4 py-3 tabular-nums">{r.durationMinutes} min</td>
                    <td className="px-4 py-3">{r.format}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.errors.length ? (
                        <span className="text-destructive">{r.errors.join("; ")}</span>
                      ) : (
                        <span className="text-muted-foreground">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
