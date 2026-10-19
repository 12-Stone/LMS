CREATE TABLE "course_upload_parts" (
	"file_id" text NOT NULL,
	"part_number" integer NOT NULL,
	"etag" text NOT NULL,
	"size_bytes" integer NOT NULL,
	CONSTRAINT "course_upload_parts_file_id_part_number_pk" PRIMARY KEY("file_id","part_number")
);
--> statement-breakpoint
ALTER TABLE "course_resources" ALTER COLUMN "size_bytes" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "private_course_files" ALTER COLUMN "size_bytes" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "private_course_files" ADD COLUMN "upload_id" text;--> statement-breakpoint
ALTER TABLE "private_course_files" ADD COLUMN "upload_state" text DEFAULT 'complete' NOT NULL;--> statement-breakpoint
ALTER TABLE "course_upload_parts" ADD CONSTRAINT "course_upload_parts_file_id_private_course_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."private_course_files"("id") ON DELETE cascade ON UPDATE no action;