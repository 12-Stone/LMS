CREATE TABLE "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"course_id" text NOT NULL,
	"bucket_id" text,
	"required" integer DEFAULT 1 NOT NULL,
	"due_date" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"completed_at" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bucket_courses" (
	"id" text PRIMARY KEY NOT NULL,
	"bucket_id" text NOT NULL,
	"course_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buckets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"audience" text DEFAULT 'All staff' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"title" text NOT NULL,
	"code" text NOT NULL,
	"issued_at" text NOT NULL,
	"signatory" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"difficulty" text DEFAULT 'Foundation' NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"format" text DEFAULT 'Video' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"team" text NOT NULL,
	"role" text DEFAULT 'learner' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sops" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"owner" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "courses" ("id","title","description","category","difficulty","duration_minutes","format","status","source") VALUES
('c1','Agency Foundations: How We Work','Our delivery model, client communication standards, and the principles behind consistent work.','Onboarding','Foundation',45,'Video','published','manual'),
('c2','Search Fundamentals for Account Teams','How search engines rank pages, and how to explain technical findings to clients clearly.','SEO','Foundation',60,'Video','published','manual'),
('c3','Technical SEO Audits','A repeatable audit process covering crawlability, indexation, site speed, and structured data.','SEO','Advanced',90,'Workshop','published','manual'),
('c4','Paid Search Account Structure','Building campaigns that are easy to manage, measure, and scale.','Paid Media','Intermediate',75,'Video','published','manual'),
('c5','Meta Ads: Creative Testing Framework','Plan, launch, and read creative tests without wasting budget.','Paid Media','Intermediate',50,'Video','published','manual'),
('c6','Analytics & Attribution Basics','GA4 setup, conversion tracking, and how to read attribution honestly.','Analytics','Foundation',55,'Video','published','manual'),
('c7','Client Reporting That Builds Trust','Turning data into clear, evidence-led monthly reports.','Client Services','Intermediate',40,'Document','published','manual'),
('c8','Writing for Search and People','Editorial standards for web copy that ranks and reads well.','Content','Foundation',35,'Document','published','manual'),
('c9','Discovery Calls and Scoping','Running discovery, setting expectations, and scoping work accurately.','Client Services','Intermediate',45,'Workshop','published','manual'),
('c10','Data Privacy and Client Access','Handling credentials, client data, and platform permissions safely.','Compliance','Foundation',25,'Video','published','manual'),
('c11','Local SEO for Multi-Location Brands','Google Business Profiles, citations, and location pages at scale.','SEO','Advanced',60,'Video','draft','manual'),
('c12','Project Management in Asana','Our task conventions, statuses, and handoff standards.','Operations','Foundation',30,'Video','published','manual');
--> statement-breakpoint
INSERT INTO "buckets" ("id","name","description","audience") VALUES
('b1','New Hire Onboarding','The first two weeks: how we work, our tools, and the standards we hold.','All new staff'),
('b2','SEO Specialist Track','Core and advanced search training for the SEO team.','SEO team'),
('b3','Paid Media Essentials','Account structure, testing, and measurement for paid specialists.','Paid Media team'),
('b4','Account Manager Readiness','Client communication, reporting, and scoping.','Client Services');
--> statement-breakpoint
INSERT INTO "bucket_courses" ("id","bucket_id","course_id","position") VALUES
('bc1','b1','c1',0),('bc2','b1','c10',1),('bc3','b1','c12',2),('bc4','b1','c6',3),
('bc5','b2','c2',0),('bc6','b2','c3',1),('bc7','b2','c8',2),('bc8','b2','c11',3),
('bc9','b3','c4',0),('bc10','b3','c5',1),('bc11','b3','c6',2),
('bc12','b4','c7',0),('bc13','b4','c9',1),('bc14','b4','c6',2);
--> statement-breakpoint
INSERT INTO "people" ("id","name","email","title","team","role") VALUES
('p1','Brady Hickman','brady@twelvestonedigital.com','Managing Director','Leadership','admin'),
('p2','Maya Okafor','maya@twelvestonedigital.com','SEO Specialist','SEO','learner'),
('p3','Daniel Reyes','daniel@twelvestonedigital.com','Paid Media Specialist','Paid Media','learner'),
('p4','Hannah Lowe','hannah@twelvestonedigital.com','Account Manager','Client Services','manager'),
('p5','Theo Brandt','theo@twelvestonedigital.com','Junior SEO Analyst','SEO','learner'),
('p6','Priya Shah','priya@twelvestonedigital.com','Content Strategist','Content','learner'),
('p7','Sam Whitfield','sam@twelvestonedigital.com','Paid Media Coordinator','Paid Media','learner');
--> statement-breakpoint
INSERT INTO "assignments" ("id","person_id","course_id","bucket_id","required","due_date","progress","status","completed_at") VALUES
('a1','p1','c1','b1',1,'2026-10-10',100,'completed','2026-10-02'),
('a2','p1','c10','b1',1,'2026-10-20',60,'in_progress',NULL),
('a3','p1','c12','b1',1,'2026-10-24',0,'not_started',NULL),
('a4','p1','c6','b1',1,'2026-10-31',25,'in_progress',NULL),
('a5','p1','c7',NULL,0,'2026-11-14',0,'not_started',NULL),
('a6','p2','c2','b2',1,'2026-09-30',100,'completed','2026-09-22'),
('a7','p2','c3','b2',1,'2026-10-12',70,'in_progress',NULL),
('a8','p2','c8','b2',1,'2026-10-28',0,'not_started',NULL),
('a9','p3','c4','b3',1,'2026-10-08',40,'in_progress',NULL),
('a10','p3','c5','b3',1,'2026-10-22',0,'not_started',NULL),
('a11','p4','c7','b4',1,'2026-10-05',100,'completed','2026-10-01'),
('a12','p4','c9','b4',1,'2026-10-14',100,'completed','2026-10-11'),
('a13','p5','c1','b1',1,'2026-10-09',100,'completed','2026-10-06'),
('a14','p5','c10','b1',1,'2026-10-13',0,'not_started',NULL),
('a15','p5','c2','b2',1,'2026-10-15',30,'in_progress',NULL),
('a16','p6','c8',NULL,1,'2026-10-11',0,'not_started',NULL),
('a17','p7','c4','b3',1,'2026-10-12',10,'in_progress',NULL),
('a18','p7','c6','b3',1,'2026-11-02',0,'not_started',NULL);
--> statement-breakpoint
INSERT INTO "sops" ("id","title","category","owner","version","status","summary","body","updated_at") VALUES
('s1','Client Onboarding Checklist','Client Services','Hannah Lowe','2.1','approved','Every step from signed proposal to kickoff call.','1. Confirm signed agreement and billing contact.\n2. Request platform access using the access template.\n3. Create the client workspace in Asana from the onboarding template.\n4. Schedule kickoff within five business days.\n5. Send the kickoff agenda 24 hours in advance.','2026-09-18'),
('s2','Monthly Reporting Standard','Analytics','Brady Hickman','1.4','approved','Structure, timing, and quality checks for monthly reports.','Reports are delivered by the fifth business day. Each report opens with a three-sentence summary, then results against agreed KPIs, then next month''s priorities. A second team member reviews every report before it is sent.','2026-08-30'),
('s3','Technical SEO Audit Procedure','SEO','Maya Okafor','3.0','approved','The repeatable audit process used for all new SEO clients.','Crawl the site, export indexation data from Search Console, review Core Web Vitals, validate structured data, and log findings by severity in the audit template.','2026-10-01'),
('s4','Paid Media Budget Change Approvals','Paid Media','Daniel Reyes','1.1','approved','When and how budget changes are approved and documented.','Changes above 15% of monthly budget require written client approval. Log every change in the account change log with the reason and expected impact.','2026-07-12'),
('s5','Credential and Access Handling','Compliance','Brady Hickman','1.0','in_review','How we request, store, and revoke client platform access.','Never request passwords by email. Use platform-native user invitations wherever possible. Revoke access within two business days of offboarding.','2026-10-09');
--> statement-breakpoint
INSERT INTO "certificates" ("id","person_id","title","code","issued_at","signatory") VALUES
('cert1','p1','Agency Foundations','TSA-2026-0142','2026-10-02','Brady Hickman, Managing Director'),
('cert2','p2','Search Fundamentals','TSA-2026-0131','2026-09-22','Brady Hickman, Managing Director'),
('cert3','p4','Account Manager Readiness','TSA-2026-0138','2026-10-11','Brady Hickman, Managing Director');
