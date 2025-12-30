PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_job_info` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`is_public` integer DEFAULT false,
	`name` text NOT NULL,
	`title` text,
	`description` text NOT NULL,
	`experience_level` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_job_info`("id", "user_id", "is_public", "name", "title", "description", "experience_level", "created_at", "updated_at") SELECT "id", "user_id", "is_public", "name", "title", "description", "experience_level", "created_at", "updated_at" FROM `job_info`;--> statement-breakpoint
DROP TABLE `job_info`;--> statement-breakpoint
ALTER TABLE `__new_job_info` RENAME TO `job_info`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `job_info_userId_idx` ON `job_info` (`user_id`);