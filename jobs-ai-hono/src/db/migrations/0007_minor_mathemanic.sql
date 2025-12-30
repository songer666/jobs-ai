CREATE TABLE `resume_template` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`thumbnail_url` text,
	`content` text NOT NULL,
	`styles` text,
	`category` text DEFAULT 'professional',
	`is_public` integer DEFAULT false,
	`use_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `template_userId_idx` ON `resume_template` (`user_id`);--> statement-breakpoint
CREATE INDEX `template_isPublic_idx` ON `resume_template` (`is_public`);--> statement-breakpoint
CREATE INDEX `template_category_idx` ON `resume_template` (`category`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_resume` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_info_id` text,
	`template_id` text,
	`name` text NOT NULL,
	`content` text,
	`raw_text` text,
	`r2_key` text,
	`r2_url` text,
	`file_size` integer,
	`mime_type` text DEFAULT 'application/pdf',
	`score` integer,
	`feedback` text,
	`analysis_result` text,
	`status` text DEFAULT 'draft',
	`is_public` integer DEFAULT false,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_info_id`) REFERENCES `job_info`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_resume`("id", "user_id", "job_info_id", "template_id", "name", "content", "raw_text", "r2_key", "r2_url", "file_size", "mime_type", "score", "feedback", "analysis_result", "status", "is_public", "created_at", "updated_at") SELECT "id", "user_id", "job_info_id", "template_id", "name", "content", "raw_text", "r2_key", "r2_url", "file_size", "mime_type", "score", "feedback", "analysis_result", "status", "is_public", "created_at", "updated_at" FROM `resume`;--> statement-breakpoint
DROP TABLE `resume`;--> statement-breakpoint
ALTER TABLE `__new_resume` RENAME TO `resume`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `resume_userId_idx` ON `resume` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_jobInfoId_idx` ON `resume` (`job_info_id`);--> statement-breakpoint
CREATE INDEX `resume_isPublic_idx` ON `resume` (`is_public`);--> statement-breakpoint
ALTER TABLE `user_profile` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `location` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `avatar_url` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `summary` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `expected_salary` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `work_experience` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `projects` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `skills` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `certificates` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `languages` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `self_evaluation` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `github` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `linkedin` text;--> statement-breakpoint
ALTER TABLE `user_profile` ADD `portfolio` text;--> statement-breakpoint
ALTER TABLE `user_profile` DROP COLUMN `tech_stack`;