CREATE TABLE `chat_message` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `interview`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_message_interview_id_idx` ON `chat_message` (`interview_id`);