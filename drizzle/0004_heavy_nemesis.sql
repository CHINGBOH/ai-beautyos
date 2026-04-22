ALTER TABLE `leads` MODIFY COLUMN `status` varchar(50) NOT NULL DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `leads` ADD `age` int;--> statement-breakpoint
ALTER TABLE `leads` ADD `budget_level` enum('低','中','高');--> statement-breakpoint
ALTER TABLE `leads` ADD `psychology_type` varchar(50);--> statement-breakpoint
ALTER TABLE `leads` ADD `psychology_tags` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `customer_tier` enum('A','B','C','D');--> statement-breakpoint
ALTER TABLE `leads` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `follow_up_date` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;