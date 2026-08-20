import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const countersignTotals = sqliteTable("ecco_countersign_totals", {
  id: integer("id").primaryKey(),
  acceptedCount: integer("accepted_count").notNull().default(0),
  updatedAt: text("updated_at").notNull()
});
