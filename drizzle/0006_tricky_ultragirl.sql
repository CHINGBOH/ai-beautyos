CREATE TABLE `trigger_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trigger_id` int NOT NULL,
	`lead_id` int,
	`executed_at` timestamp NOT NULL DEFAULT (now()),
	`status` enum('success','failed','skipped') NOT NULL,
	`result` text,
	`error_message` text,
	CONSTRAINT `trigger_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `triggers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('time','behavior','weather') NOT NULL,
	`time_config` text,
	`behavior_config` text,
	`weather_config` text,
	`action` enum('send_message','send_email','create_task','notify_staff') NOT NULL,
	`action_config` text,
	`target_filter` text,
	`is_active` int NOT NULL DEFAULT 1,
	`execution_count` int NOT NULL DEFAULT 0,
	`last_executed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `triggers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `xiaohongshu_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int NOT NULL,
	`author_name` varchar(100) NOT NULL,
	`author_avatar` varchar(500),
	`content` text NOT NULL,
	`reply_content` text,
	`reply_status` enum('pending','replied','ignored') NOT NULL DEFAULT 'pending',
	`sentiment` enum('positive','neutral','negative'),
	`is_filtered` int NOT NULL DEFAULT 0,
	`commented_at` timestamp NOT NULL,
	`replied_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `xiaohongshu_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `xiaohongshu_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`images` text,
	`tags` text,
	`content_type` varchar(50) NOT NULL,
	`project` varchar(100),
	`status` enum('draft','scheduled','published','deleted') NOT NULL DEFAULT 'draft',
	`published_at` timestamp,
	`scheduled_at` timestamp,
	`view_count` int NOT NULL DEFAULT 0,
	`like_count` int NOT NULL DEFAULT 0,
	`comment_count` int NOT NULL DEFAULT 0,
	`share_count` int NOT NULL DEFAULT 0,
	`collect_count` int NOT NULL DEFAULT 0,
	`last_synced_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `xiaohongshu_posts_id` PRIMARY KEY(`id`)
);
