ALTER TABLE `metrics` ADD `chunk_size` integer DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE `metrics` ADD `chunk_overlap` integer DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE `metrics` ADD `chunking_strategy` text DEFAULT 'markdown' NOT NULL;