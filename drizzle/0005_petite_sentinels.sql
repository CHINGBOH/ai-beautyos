ALTER TABLE `conversations` ADD `psychology_type` enum('恐惧型','贪婪型','安全型','敏感型');--> statement-breakpoint
ALTER TABLE `conversations` ADD `psychology_tags` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `budget_level` enum('低','中','高');--> statement-breakpoint
ALTER TABLE `conversations` ADD `customer_tier` enum('A','B','C','D');