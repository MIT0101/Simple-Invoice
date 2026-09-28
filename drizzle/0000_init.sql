CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`work_url` text DEFAULT '' NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price_cents` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "invoice_items_quantity_check" CHECK("invoice_items"."quantity" > 0),
	CONSTRAINT "invoice_items_unit_price_check" CHECK("invoice_items"."unit_price_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_id_idx` ON `invoice_items` (`invoice_id`,`position`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`client_name` text NOT NULL,
	`client_details` text DEFAULT '' NOT NULL,
	`issue_date` text NOT NULL,
	`due_date` text,
	`currency` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`posted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "invoices_status_check" CHECK("invoices"."status" in ('draft', 'posted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `invoices_issue_date_idx` ON `invoices` (`issue_date`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`payment_details` text DEFAULT '' NOT NULL,
	`signature_image` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`invoice_prefix` text DEFAULT 'INV-' NOT NULL,
	`payment_terms_days` integer DEFAULT 14 NOT NULL,
	`updated_at` integer NOT NULL
);
