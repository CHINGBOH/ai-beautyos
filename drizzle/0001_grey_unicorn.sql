CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`visitor_name` varchar(100),
	`visitor_phone` varchar(20),
	`visitor_wechat` varchar(100),
	`source` varchar(50) NOT NULL DEFAULT 'web',
	`status` enum('active','converted','closed') NOT NULL DEFAULT 'active',
	`lead_id` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversations_session_id_unique` UNIQUE(`session_id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100) NOT NULL,
	`tags` text,
	`embedding` text,
	`view_count` int NOT NULL DEFAULT 0,
	`used_count` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`airtable_id` varchar(100),
	`name` varchar(100) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`wechat` varchar(100),
	`interested_services` text,
	`budget` varchar(50),
	`message` text,
	`source` varchar(50) NOT NULL,
	`source_content` varchar(255),
	`status` varchar(50) NOT NULL DEFAULT '新线索',
	`conversation_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`synced_at` timestamp,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `leads_airtable_id_unique` UNIQUE(`airtable_id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`knowledge_used` text,
	`extracted_info` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
