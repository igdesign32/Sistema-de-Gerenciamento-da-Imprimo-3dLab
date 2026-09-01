CREATE TABLE `consignments` (
	`id` text PRIMARY KEY NOT NULL,
	`establishment` text NOT NULL,
	`items` text NOT NULL,
	`delivery_at` integer NOT NULL,
	`visit_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_consignments_delivery` ON `consignments` (`delivery_at`);--> statement-breakpoint
CREATE TABLE `consignment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`consignment_id` text NOT NULL,
	`inventory_item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`quantity` real NOT NULL,
	`passed_value` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`consignment_id`) REFERENCES `consignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_consignment_items_consignment` ON `consignment_items` (`consignment_id`);
