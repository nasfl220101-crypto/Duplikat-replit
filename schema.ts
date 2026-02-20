import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const verifications = pgTable("verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  verificationId: text("verification_id").notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"),
  collegeName: text("college_name"),
  collegeId: text("college_id"),
  studentName: text("student_name"),
  studentEmail: text("student_email"),
  errorMessage: text("error_message"),
  redirectUrl: text("redirect_url"),
  documentSvg: text("document_svg"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verificationLogs = pgTable("verification_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  verificationId: text("verification_id").notNull(),
  message: text("message").notNull(),
  level: text("level").notNull().default("info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cards = pgTable("cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  collegeName: text("college_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  department: text("department").notNull(),
  studentId: text("student_id").notNull(),
  validUntil: text("valid_until").notNull(),
  primaryColor: text("primary_color").notNull().default("#1e3a8a"),
  gender: text("gender").notNull().default("male"),
  photoUrl: text("photo_url"),
  svgContent: text("svg_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const proxies = pgTable("proxies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  label: text("label"),
  role: text("role").notNull().default("submit"),
});

export const telegramUsers = pgTable("telegram_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  credits: real("credits").notNull().default(1),
  isVip: boolean("is_vip").notNull().default(false),
  vipExpiresAt: timestamp("vip_expires_at"),
  isBanned: boolean("is_banned").notNull().default(false),
  referralCode: text("referral_code"),
  referredBy: text("referred_by"),
  referralCount: integer("referral_count").notNull().default(0),
  lastCheckIn: timestamp("last_check_in"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").notNull(),
  packageName: text("package_name").notNull(),
  amountUsd: text("amount_usd").notNull(),
  credits: real("credits").notNull().default(0),
  network: text("network").notNull(),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").notNull(),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const telegramBots = pgTable("telegram_bots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull(),
  label: text("label").notNull().default("Bot"),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("stopped"),
  username: text("username"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const botSettings = pgTable("bot_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const universitySettings = pgTable("university_settings", {
  universityId: integer("university_id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
});

export const insertUniversitySettingSchema = createInsertSchema(universitySettings);
export type UniversitySetting = typeof universitySettings.$inferSelect;
export type InsertUniversitySetting = z.infer<typeof insertUniversitySettingSchema>;

export const templateSettings = pgTable("template_settings", {
  templateId: text("template_id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
});

export const insertTemplateSettingSchema = createInsertSchema(templateSettings);
export type TemplateSetting = typeof templateSettings.$inferSelect;
export type InsertTemplateSetting = z.infer<typeof insertTemplateSettingSchema>;

export const insertVerificationSchema = createInsertSchema(verifications).omit({ id: true, createdAt: true });
export const insertLogSchema = createInsertSchema(verificationLogs).omit({ id: true, createdAt: true });
export const insertCardSchema = createInsertSchema(cards).omit({ id: true, createdAt: true });
export const insertProxySchema = createInsertSchema(proxies).omit({ id: true });
export const insertTelegramUserSchema = createInsertSchema(telegramUsers).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({ id: true, createdAt: true });
export const insertTelegramBotSchema = createInsertSchema(telegramBots).omit({ id: true, createdAt: true });
export const insertBotSettingSchema = createInsertSchema(botSettings);

export type Verification = typeof verifications.$inferSelect;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type VerificationLog = typeof verificationLogs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;
export type Proxy = typeof proxies.$inferSelect;
export type InsertProxy = z.infer<typeof insertProxySchema>;
export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = z.infer<typeof insertTelegramUserSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type TelegramBot = typeof telegramBots.$inferSelect;
export type InsertTelegramBot = z.infer<typeof insertTelegramBotSchema>;
export type BotSetting = typeof botSettings.$inferSelect;
export type InsertBotSetting = z.infer<typeof insertBotSettingSchema>;
