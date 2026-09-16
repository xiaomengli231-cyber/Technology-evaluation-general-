CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`literature_id` text NOT NULL,
	`site_id` text NOT NULL,
	`scale` text NOT NULL,
	`implementation_year` integer,
	`measures` text,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`import_batch_id` text
);
--> statement-breakpoint
CREATE TABLE `costs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`arm_id` text NOT NULL,
	`cost_type` text NOT NULL,
	`value` real,
	`unit` text,
	`price_year` integer,
	`boundary` text,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`import_batch_id` text
);
--> statement-breakpoint
CREATE TABLE `evidence_quality` (
	`arm_id` text PRIMARY KEY NOT NULL,
	`evidence_level` text NOT NULL,
	`has_control` integer,
	`has_replicate` integer,
	`has_statistics` integer,
	`followup_days` integer,
	`risk_monitoring` text,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`import_batch_id` text
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`entity_type` text,
	`object_key` text,
	`status` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`warning_count` integer DEFAULT 0 NOT NULL,
	`mapping_json` text NOT NULL,
	`payload_json` text NOT NULL,
	`issues_json` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE TABLE `indicator_definitions` (
	`code` text PRIMARY KEY NOT NULL,
	`criterion` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`principle` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `indicator_results` (
	`id` text PRIMARY KEY NOT NULL,
	`technology_code` text NOT NULL,
	`sub_technology_code` text NOT NULL,
	`case_id` text NOT NULL,
	`arm_id` text NOT NULL,
	`lake` text NOT NULL,
	`scale` text NOT NULL,
	`indicator_code` text NOT NULL,
	`pollutant` text,
	`value` real,
	`unit` text NOT NULL,
	`basis` text NOT NULL,
	`formula` text NOT NULL,
	`evidence_level` text NOT NULL,
	`evidence_weight` real NOT NULL,
	`observed_at` text NOT NULL,
	`followup_days` integer DEFAULT 0 NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`is_primary` integer DEFAULT true NOT NULL,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`import_batch_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_result_primary_window` ON `indicator_results` (`arm_id`,`indicator_code`,`pollutant`,`observed_at`);--> statement-breakpoint
CREATE TABLE `literature` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`doi` text,
	`url` text,
	`fulltext_status` text,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`import_batch_id` text
);
--> statement-breakpoint
CREATE TABLE `observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`arm_id` text NOT NULL,
	`variable` text NOT NULL,
	`pollutant` text,
	`role` text NOT NULL,
	`raw_value` real,
	`raw_unit` text,
	`observed_at` text,
	`source_locator` text,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`import_batch_id` text
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`lake` text NOT NULL,
	`zone` text,
	`latitude` real,
	`longitude` real,
	`area` real,
	`depth` real,
	`background` text,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`import_batch_id` text
);
--> statement-breakpoint
CREATE TABLE `sub_technologies` (
	`code` text PRIMARY KEY NOT NULL,
	`technology_code` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `technologies` (
	`code` text PRIMARY KEY NOT NULL,
	`source_id` text,
	`name` text NOT NULL,
	`group_name` text NOT NULL,
	`stage` text NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `treatment_arms` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`technology_code` text NOT NULL,
	`sub_technology_code` text NOT NULL,
	`parameters` text,
	`scale_value` real,
	`scale_unit` text,
	`control_arm` text,
	`publication_status` text DEFAULT 'draft' NOT NULL,
	`import_batch_id` text
);
