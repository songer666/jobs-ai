CREATE TABLE `job_info` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`description` text NOT NULL,
	`experience_level` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_info_userId_idx` ON `job_info` (`user_id`);--> statement-breakpoint
CREATE TABLE `interview` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_info_id` text NOT NULL,
	`duration` integer,
	`chat_id` text,
	`feedback` text,
	`score` integer,
	`status` text DEFAULT 'pending',
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_info_id`) REFERENCES `job_info`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `interview_userId_idx` ON `interview` (`user_id`);--> statement-breakpoint
CREATE INDEX `interview_jobInfoId_idx` ON `interview` (`job_info_id`);--> statement-breakpoint
CREATE TABLE `question` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_info_id` text NOT NULL,
	`text` text NOT NULL,
	`difficulty` text NOT NULL,
	`answer` text,
	`feedback` text,
	`score` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_info_id`) REFERENCES `job_info`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `question_userId_idx` ON `question` (`user_id`);--> statement-breakpoint
CREATE INDEX `question_jobInfoId_idx` ON `question` (`job_info_id`);--> statement-breakpoint
CREATE TABLE `resume` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_info_id` text,
	`name` text NOT NULL,
	`r2_key` text NOT NULL,
	`r2_url` text,
	`file_size` integer,
	`mime_type` text DEFAULT 'application/pdf',
	`score` integer,
	`feedback` text,
	`status` text DEFAULT 'draft',
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_info_id`) REFERENCES `job_info`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `resume_userId_idx` ON `resume` (`user_id`);--> statement-breakpoint
CREATE INDEX `resume_jobInfoId_idx` ON `resume` (`job_info_id`);