CREATE TABLE `resume_analysis` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_info_id` text,
	`file_name` text NOT NULL,
	`pdf_r2_key` text NOT NULL,
	`feedback` text,
	`score` integer,
	`job_description` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_info_id`) REFERENCES `job_info`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `resume_analysis_userId_idx` ON `resume_analysis` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_analysis_jobInfoId_idx` ON `resume_analysis` (`job_info_id`);--> statement-breakpoint
DROP TABLE `resume_template`;--> statement-breakpoint
DROP INDEX `resume_isPublic_idx`;--> statement-breakpoint
ALTER TABLE `resume` ADD `style_prompt` text;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `template_id`;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `raw_text`;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `r2_key`;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `r2_url`;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `file_size`;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `mime_type`;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `score`;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `feedback`;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `analysis_result`;--> statement-breakpoint
ALTER TABLE `resume` DROP COLUMN `is_public`;