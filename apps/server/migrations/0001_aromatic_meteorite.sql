ALTER TABLE `metrics` ADD `pages_crawled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `metrics` ADD `pages_crawled_remaining` integer DEFAULT 40 NOT NULL;