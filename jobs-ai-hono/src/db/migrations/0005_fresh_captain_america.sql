ALTER TABLE `interview` ADD `language` text DEFAULT 'zh';--> statement-breakpoint
ALTER TABLE `interview` ADD `model` text DEFAULT 'gemini';--> statement-breakpoint
ALTER TABLE `interview` ADD `question_count` integer DEFAULT 0;