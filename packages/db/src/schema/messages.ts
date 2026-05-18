import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  text: text("text").notNull(),
  encryptedText: text("encrypted_text"),
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  deletedForSender: boolean("deleted_for_sender").notNull().default(false),
  deletedForRecipient: boolean("deleted_for_recipient").notNull().default(false),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true, timestamp: true, readAt: true, editedAt: true,
  deletedForSender: true, deletedForRecipient: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
