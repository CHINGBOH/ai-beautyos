CREATE TABLE `wework_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`corp_id` varchar(100),
	`corp_secret` varchar(200),
	`agent_id` int,
	`token` varchar(100),
	`encoding_aes_key` varchar(200),
	`access_token` text,
	`token_expires_at` timestamp,
	`is_active` int NOT NULL DEFAULT 1,
	`is_mock_mode` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wework_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wework_contact_way` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_id` varchar(100) NOT NULL,
	`type` enum('single','multi') NOT NULL DEFAULT 'single',
	`scene` enum('1','2') NOT NULL DEFAULT '1',
	`qr_code` text,
	`remark` varchar(255),
	`skip_verify` int NOT NULL DEFAULT 1,
	`state` varchar(100),
	`user_ids` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wework_contact_way_id` PRIMARY KEY(`id`),
	CONSTRAINT `wework_contact_way_config_id_unique` UNIQUE(`config_id`)
);
--> statement-breakpoint
CREATE TABLE `wework_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_user_id` varchar(100) NOT NULL,
	`name` varchar(100),
	`avatar` text,
	`type` enum('1','2') NOT NULL DEFAULT '1',
	`gender` enum('0','1','2') NOT NULL DEFAULT '0',
	`union_id` varchar(100),
	`position` varchar(100),
	`corp_name` varchar(200),
	`corp_full_name` varchar(200),
	`external_profile` text,
	`follow_user_id` varchar(100),
	`remark` varchar(255),
	`description` text,
	`create_time` timestamp,
	`tags` text,
	`state` varchar(100),
	`conversation_id` int,
	`lead_id` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wework_customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `wework_customers_external_user_id_unique` UNIQUE(`external_user_id`)
);
--> statement-breakpoint
CREATE TABLE `wework_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_user_id` varchar(100) NOT NULL,
	`send_user_id` varchar(100) NOT NULL,
	`msg_type` varchar(20) NOT NULL,
	`content` text NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`error_msg` text,
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wework_messages_id` PRIMARY KEY(`id`)
);
