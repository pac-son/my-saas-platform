import { pgTable, uuid, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Enums force data integrity (No invalid statuses allowed)
export const currencyEnum = pgEnum('currency', ['NGN', 'USD']);
export const txnTypeEnum = pgEnum('txn_type', ['deposit', 'withdrawal', 'interest', 'fee']);
export const statusEnum = pgEnum('status', ['pending', 'completed', 'failed']);

// 2. Users Table (Linked to your future Auth system)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Wallets Table
export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
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