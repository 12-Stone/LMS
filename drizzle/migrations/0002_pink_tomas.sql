CREATE TABLE "private_course_files" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"org_id" text,
	"storage_scope_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"bucket" text NOT NULL,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"course_id" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "private_course_files" ADD CONSTRAINT "private_course_files_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;