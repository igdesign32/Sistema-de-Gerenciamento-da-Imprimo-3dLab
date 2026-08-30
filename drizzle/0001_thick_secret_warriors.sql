CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`inventory_item_id` text,
	`item_name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_cost` real NOT NULL,
	`unit_price` real NOT NULL,
	`subtotal` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order_id` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_inventory_id` ON `order_items` (`inventory_item_id`);--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `sku` text;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `description` text;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `sale_price` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_inventory_category_active_name` ON `inventory_items` (`category`,`active`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_sku` ON `inventory_items` (`sku`);--> statement-breakpoint
ALTER TABLE `orders` ADD `total_cost` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `estimated_profit` real DEFAULT 0 NOT NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `inventory_items` (`id`,`sku`,`name`,`description`,`category`,`color`,`unit`,`quantity`,`min_quantity`,`unit_cost`,`sale_price`,`active`,`created_at`,`updated_at`) VALUES ('part-001','001','Abelha articulada','Modelo decorativo','part','Amarelo Velvet','un',12,2,5.82,15,1,unixepoch(),unixepoch());--> statement-breakpoint
INSERT OR IGNORE INTO `inventory_items` (`id`,`sku`,`name`,`description`,`category`,`color`,`unit`,`quantity`,`min_quantity`,`unit_cost`,`sale_price`,`active`,`created_at`,`updated_at`) VALUES ('part-002','002','Suporte para celular','Linha escritório','part','Preto','un',8,2,7.40,22,1,unixepoch(),unixepoch());--> statement-breakpoint
INSERT OR IGNORE INTO `inventory_items` (`id`,`sku`,`name`,`description`,`category`,`color`,`unit`,`quantity`,`min_quantity`,`unit_cost`,`sale_price`,`active`,`created_at`,`updated_at`) VALUES ('part-003','003','Vaso geométrico','Coleção decorativa','part','Branco','un',4,2,12.60,35,1,unixepoch(),unixepoch());--> statement-breakpoint
INSERT OR IGNORE INTO `inventory_items` (`id`,`sku`,`name`,`description`,`category`,`color`,`unit`,`quantity`,`min_quantity`,`unit_cost`,`sale_price`,`active`,`created_at`,`updated_at`) VALUES ('part-004','004','Chaveiro personalizado','Linha personalizada','part','Laranja','un',25,5,2.15,8,1,unixepoch(),unixepoch());--> statement-breakpoint
INSERT OR IGNORE INTO `customers` (`id`,`name`,`phone`,`active`,`created_at`,`updated_at`) VALUES ('customer-lumina','Lumina Arquitetura','(11) 99945-2231',1,unixepoch(),unixepoch());--> statement-breakpoint
INSERT OR IGNORE INTO `customers` (`id`,`name`,`phone`,`active`,`created_at`,`updated_at`) VALUES ('customer-studio','Studio Objeto','(11) 98872-0198',1,unixepoch(),unixepoch());--> statement-breakpoint
INSERT OR IGNORE INTO `customers` (`id`,`name`,`phone`,`active`,`created_at`,`updated_at`) VALUES ('customer-orto','Clínica Orto+','(11) 99128-6330',1,unixepoch(),unixepoch());--> statement-breakpoint
INSERT OR IGNORE INTO `customers` (`id`,`name`,`phone`,`active`,`created_at`,`updated_at`) VALUES ('customer-rafael','Rafael Martins','(11) 98041-7212',1,unixepoch(),unixepoch());
