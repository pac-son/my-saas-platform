import { pgTable, uuid, varchar, integer, timestamp, pgEnum, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Enums force data integrity (No invalid statuses allowed)
export const currencyEnum = pgEnum('currency', ['NGN', 'USD']);
export const txnTypeEnum = pgEnum('txn_type', ['deposit', 'withdrawal', 'interest', 'fee', 'transfer']);
export const statusEnum = pgEnum('status', ['pending', 'completed', 'failed']);

// 1. Added Merchants table
export const merchants = pgTable('merchants', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(), // Merchants will log in via Clerk
  businessName: varchar('business_name', { length: 255 }).notNull(),
  websiteUrl: varchar('website_url', { length: 255 }),
  // API Keys for their Shopify/WooCommerce backend to talk to us
  publishableKey: text('publishable_key').notNull().unique(), 
  secretKey: text('secret_key').notNull().unique(),
  webhookUrl: varchar('webhook_url', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Users Table (Linked to your future Auth system)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Wallets Table
export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  currency: currencyEnum('currency').default('NGN').notNull(),
  balance: integer('balance').default(0).notNull(), // Stored in KOBO/CENTS
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 4. Transactions Table (The Ledger)
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletId: uuid('wallet_id').references(() => wallets.id).notNull(),
  amount: integer('amount').notNull(), // + for Credit, - for Debit
  type: txnTypeEnum('type').notNull(),
  status: statusEnum('status').default('pending').notNull(),
  reference: varchar('reference', { length: 255 }).unique(), // Stripe/Paystack Ref
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const vaults = pgTable('vaults', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id),
  merchantId: uuid('merchant_id').references(() => merchants.id),
  productId: varchar('product_id', { length: 255 }), // The ID of the item in the merchant's store
  name: varchar('name', { length: 255 }).notNull(), // e.g., "New Laptop"
  targetAmount: integer('target_amount').notNull(), // Goal amount in kobo/cents
  currentAmount: integer('current_amount').notNull().default(0), // Amount saved so far
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' or 'completed'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

//The Webhook Queue for Enterprise Reliability
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id).notNull(),
  vaultId: uuid('vault_id').references(() => vaults.id).notNull(),
  
  // What are we sending?
  eventType: varchar('event_type', { length: 255 }).notNull(), // e.g., 'snbl.order.fully_funded'
  payload: text('payload').notNull(), // We will stringify the JSON data here
  
  // Delivery Tracking
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'success', 'failed'
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  nextAttemptAt: timestamp('next_attempt_at').defaultNow(), // For exponential backoff
  
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
}));

export const vaultsRelations = relations(vaults, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [vaults.merchantId],
    references: [merchants.id],
  }),
  webhookEvents: many(webhookEvents),
}));

export const merchantsRelations = relations(merchants, ({ many }) => ({
  vaults: many(vaults),
  webhookEvents: many(webhookEvents),
}));

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  merchant: one(merchants, {
    fields: [webhookEvents.merchantId],
    references: [merchants.id],
  }),
  vault: one(vaults, {
    fields: [webhookEvents.vaultId],
    references: [vaults.id],
  }),
}));

// The Idempotency Lock Table
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: varchar('key', { length: 255 }).primaryKey(), // The unique ID sent by the frontend
  userId: text('user_id').notNull().references(() => users.id),
  action: varchar('action', { length: 255 }).notNull(), // e.g., 'fund_vault'
  createdAt: timestamp('created_at').defaultNow(),
});