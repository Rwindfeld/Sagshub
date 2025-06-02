import { sql } from 'drizzle-orm';
import { and, eq } from 'drizzle-orm/expressions';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Definer cases tabellen
export const cases = sqliteTable('cases', {
  id: integer('id').primaryKey(),
  caseNumber: text('caseNumber').notNull(),
  customerId: integer('customerId').notNull(),
  customerName: text('customerName').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  treatment: text('treatment').notNull(),
  priority: text('priority').notNull(),
  deviceType: text('deviceType').notNull(),
  accessories: text('accessories'),
  importantNotes: text('importantNotes'),
  status: text('status').notNull(),
  isInternal: integer('isInternal', { mode: 'boolean' }).notNull().default(false),
  isRead: integer('isRead', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
  createdBy: text('createdBy').notNull()
});

export class Storage {
  constructor(private db: any) {}

  async getUnreadInternalCasesCount(): Promise<number> {
    console.log('Getting unread internal cases count...');
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(and(
        eq(cases.isInternal, true),
        eq(cases.isRead, false)
      ));
    
    console.log('Unread internal cases count result:', result);
    return result[0]?.count || 0;
  }

  async getCaseStatusCounts(): Promise<Record<string, number>> {
    const result = await this.db
      .select({ status: cases.status, count: sql<number>`count(*)` })
      .from(cases)
      .groupBy(cases.status);
    // Returnér som { status: count, ... }
    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.status] = row.count;
    }
    return counts;
  }
} 