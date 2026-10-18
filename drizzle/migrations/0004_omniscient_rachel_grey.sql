ALTER TABLE "private_course_files" DROP CONSTRAINT "private_course_files_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "private_course_files" ADD CONSTRAINT "private_course_files_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;