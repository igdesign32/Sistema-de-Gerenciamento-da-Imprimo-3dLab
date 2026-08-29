import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
};

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(), email: text('email').notNull(), fullName: text('full_name').notNull(),
  role: text('role', { enum: ['admin', 'production', 'sales_finance'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true), ...timestamps,
}, t => [uniqueIndex('idx_profiles_email').on(t.email)]);

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(), name: text('name').notNull(), document: text('document'), email: text('email'), phone: text('phone'), notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true), ...timestamps,
}, t => [index('idx_customers_name').on(t.name)]);

export const quotes = sqliteTable('quotes', {
  id: text('id').primaryKey(), customerId: text('customer_id').references(() => customers.id), customerName: text('customer_name').notNull(), itemName: text('item_name').notNull(),
  status: text('status', { enum: ['draft', 'sent', 'approved', 'rejected', 'expired'] }).notNull().default('draft'),
  materialType: text('material_type').notNull().default('PLA'), materialGrams: real('material_grams').notNull(), materialCost: real('material_cost').notNull(),
  printHours: real('print_hours').notNull(), energyRate: real('energy_rate').notNull(), energyCost: real('energy_cost').notNull(),
  machineHourlyRate: real('machine_hourly_rate').notNull(), machineCost: real('machine_cost').notNull(), packagingCost: real('packaging_cost').notNull(), finishingCost: real('finishing_cost').notNull().default(0),
  feesPercent: real('fees_percent').notNull(), feesCost: real('fees_cost').notNull(), marginPercent: real('margin_percent').notNull(), totalPrice: real('total_price').notNull(),
  notes: text('notes'), validUntil: integer('valid_until', { mode: 'timestamp' }), createdBy: text('created_by').notNull(), ...timestamps,
}, t => [index('idx_quotes_customer_id').on(t.customerId), index('idx_quotes_status_created').on(t.status, t.createdAt)]);

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(), quoteId: text('quote_id').references(() => quotes.id), customerId: text('customer_id').references(() => customers.id),
  status: text('status', { enum: ['approved', 'queued', 'production', 'finishing', 'ready', 'delivered', 'cancelled'] }).notNull().default('approved'),
  dueAt: integer('due_at', { mode: 'timestamp' }), totalPrice: real('total_price').notNull(), assignedTo: text('assigned_to').references(() => profiles.id), notes: text('notes'), ...timestamps,
}, t => [index('idx_orders_status_due').on(t.status, t.dueAt), index('idx_orders_customer_id').on(t.customerId)]);

export const productionJobs = sqliteTable('production_jobs', {
  id: text('id').primaryKey(), orderId: text('order_id').notNull().references(() => orders.id), machineName: text('machine_name').notNull(),
  stage: text('stage', { enum: ['queue', 'setup', 'printing', 'finishing', 'done', 'failed'] }).notNull().default('queue'), progress: integer('progress').notNull().default(0),
  plannedHours: real('planned_hours'), actualHours: real('actual_hours'), startedAt: integer('started_at', { mode: 'timestamp' }), completedAt: integer('completed_at', { mode: 'timestamp' }), notes: text('notes'), ...timestamps,
}, t => [index('idx_jobs_stage_order').on(t.stage, t.orderId)]);

export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(), name: text('name').notNull(), category: text('category', { enum: ['filament', 'resin', 'packaging', 'part', 'other'] }).notNull(),
  materialType: text('material_type'), color: text('color'), brand: text('brand'), unit: text('unit').notNull().default('g'), quantity: real('quantity').notNull().default(0), minQuantity: real('min_quantity').notNull().default(0), unitCost: real('unit_cost').notNull().default(0), ...timestamps,
}, t => [index('idx_inventory_category_name').on(t.category, t.name)]);

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(), orderId: text('order_id').references(() => orders.id), type: text('type', { enum: ['income', 'expense'] }).notNull(), category: text('category').notNull(), description: text('description').notNull(), amount: real('amount').notNull(), dueAt: integer('due_at', { mode: 'timestamp' }).notNull(), paidAt: integer('paid_at', { mode: 'timestamp' }), paymentMethod: text('payment_method'), createdBy: text('created_by').notNull(), ...timestamps,
}, t => [index('idx_transactions_type_due').on(t.type, t.dueAt), index('idx_transactions_order_id').on(t.orderId)]);

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(), value: text('value').notNull(), updatedBy: text('updated_by').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(), actorId: text('actor_id').notNull(), entityType: text('entity_type').notNull(), entityId: text('entity_id').notNull(), action: text('action').notNull(), beforeJson: text('before_json'), afterJson: text('after_json'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [index('idx_audit_entity_created').on(t.entityType, t.entityId, t.createdAt)]);

// Metadata pronta para STL/3MF, fotos e PDFs; os bytes podem ir para R2 ou Supabase Storage.
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(), entityType: text('entity_type').notNull(), entityId: text('entity_id').notNull(), kind: text('kind', { enum: ['stl', '3mf', 'photo', 'pdf', 'other'] }).notNull(), fileName: text('file_name').notNull(), storageKey: text('storage_key').notNull(), contentType: text('content_type'), sizeBytes: integer('size_bytes'), createdBy: text('created_by').notNull(), createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [index('idx_attachments_entity').on(t.entityType, t.entityId)]);
