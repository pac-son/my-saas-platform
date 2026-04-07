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