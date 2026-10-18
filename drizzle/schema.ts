import { sql } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull().default("Foundation"),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  format: text("format").notNull().default("Video"),
  status: text("status").notNull().default("published"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const buckets = pgTable("buckets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  audience: text("audience").notNull().default("All staff"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const bucketCourses = pgTable("bucket_courses", {
  id: text("id").primaryKey(),
  bucketId: text("bucket_id").notNull(),
  courseId: text("course_id").notNull(),
  position: integer("position").notNull().default(0),
});

export const people = pgTable("people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  title: text("title").notNull().default(""),
  team: text("team").notNull(),
  role: text("role").notNull().default("learner"),
  lastSeenAt: text("last_seen_at"),
});

export const courseResources = pgTable("course_resources", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  kind: text("kind").notNull().default("file"),
  mimeType: text("mime_type").notNull().default(""),
  sizeBytes: integer("size_bytes").notNull().default(0),
  url: text("url").notNull(),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const privateCourseFiles = pgTable("private_course_files", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
  storageScopeId: text("storage_scope_id").notNull(),
  endpoint: text("endpoint").notNull(),
  bucket: text("bucket").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  courseId: text("course_id").references(() => courses.id),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const assignments = pgTable("assignments", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  courseId: text("course_id").notNull(),
  bucketId: text("bucket_id"),
  required: integer("required").notNull().default(1),
  dueDate: text("due_date"),
  progress: integer("progress").notNull().default(0),
  status: text("status").notNull().default("not_started"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const sops = pgTable("sops", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  owner: text("owner").notNull(),
  version: text("version").notNull().default("1.0"),
  status: text("status").notNull().default("approved"),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export const certificates = pgTable("certificates", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull(),
  title: text("title").notNull(),
  code: text("code").notNull(),
  issuedAt: text("issued_at").notNull(),
  signatory: text("signatory").notNull().default(""),
});
