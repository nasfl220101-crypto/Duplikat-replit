import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  verifications, verificationLogs, cards, proxies,
  telegramUsers, payments, creditTransactions, universitySettings, templateSettings,
  telegramBots, botSettings,
  type Verification, type InsertVerification,
  type VerificationLog, type InsertLog,
  type Card, type InsertCard,
  type Proxy, type InsertProxy,
  type TelegramUser, type InsertTelegramUser,
  type Payment, type InsertPayment,
  type CreditTransaction, type InsertCreditTransaction,
  type UniversitySetting,
  type TemplateSetting,
  type TelegramBot, type InsertTelegramBot,
  type BotSetting,
} from "@shared/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  createVerification(data: InsertVerification): Promise<Verification>;
  getVerification(id: string): Promise<Verification | undefined>;
  getVerificationByVid(vid: string): Promise<Verification | undefined>;
  getAllVerifications(): Promise<Verification[]>;
  updateVerification(id: string, data: Partial<Verification>): Promise<Verification | undefined>;
  deleteVerification(id: string): Promise<void>;

  addLog(data: InsertLog): Promise<VerificationLog>;
  getLogsByVerification(vid: string): Promise<VerificationLog[]>;

  createCard(data: InsertCard): Promise<Card>;
  getCard(id: string): Promise<Card | undefined>;
  getAllCards(): Promise<Card[]>;
  deleteCard(id: string): Promise<void>;

  getProxies(): Promise<Proxy[]>;
  addProxy(data: InsertProxy): Promise<Proxy>;
  deleteProxy(id: string): Promise<void>;
  deleteAllProxies(): Promise<number>;
  deleteProxiesByIds(ids: string[]): Promise<number>;
  toggleProxy(id: string, active: boolean): Promise<void>;
  updateProxy(id: string, data: Partial<Proxy>): Promise<Proxy | undefined>;

  getTelegramUser(telegramId: string): Promise<TelegramUser | undefined>;
  createTelegramUser(data: InsertTelegramUser): Promise<TelegramUser>;
  updateTelegramUserCredits(telegramId: string, delta: number): Promise<TelegramUser | undefined>;
  setTelegramUserCredits(telegramId: string, credits: number): Promise<TelegramUser | undefined>;
  setVip(telegramId: string, expiresAt: Date): Promise<void>;
  removeVip(telegramId: string): Promise<void>;
  getAllTelegramUsers(): Promise<TelegramUser[]>;
  banTelegramUser(telegramId: string, banned: boolean): Promise<void>;

  createPayment(data: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPendingPayments(): Promise<Payment[]>;
  getPaymentsByUser(telegramId: string): Promise<Payment[]>;
  updatePaymentStatus(id: string, status: string, txHash?: string): Promise<Payment | undefined>;

  addCreditTransaction(data: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransactions(telegramId: string): Promise<CreditTransaction[]>;

  getTelegramUserByReferralCode(code: string): Promise<TelegramUser | undefined>;
  updateTelegramUser(telegramId: string, data: Partial<TelegramUser>): Promise<TelegramUser | undefined>;

  getUniversitySettings(): Promise<UniversitySetting[]>;
  setUniversitySetting(universityId: number, enabled: boolean): Promise<void>;

  getTemplateSettings(): Promise<TemplateSetting[]>;
  setTemplateSetting(templateId: string, enabled: boolean): Promise<void>;

  getTelegramBots(): Promise<TelegramBot[]>;
  getTelegramBot(id: string): Promise<TelegramBot | undefined>;
  createTelegramBot(data: InsertTelegramBot): Promise<TelegramBot>;
  updateTelegramBot(id: string, data: Partial<TelegramBot>): Promise<TelegramBot | undefined>;
  deleteTelegramBot(id: string): Promise<void>;

  getBotSettings(): Promise<BotSetting[]>;
  getBotSetting(key: string): Promise<string | undefined>;
  setBotSetting(key: string, value: string): Promise<void>;
  deleteBotSetting(key: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createVerification(data: InsertVerification): Promise<Verification> {
    const [v] = await db.insert(verifications).values(data).returning();
    return v;
  }

  async getVerification(id: string): Promise<Verification | undefined> {
    const [v] = await db.select().from(verifications).where(eq(verifications.id, id));
    return v;
  }

  async getVerificationByVid(vid: string): Promise<Verification | undefined> {
    const [v] = await db.select().from(verifications).where(eq(verifications.verificationId, vid));
    return v;
  }

  async getAllVerifications(): Promise<Verification[]> {
    return db.select().from(verifications).orderBy(desc(verifications.createdAt));
  }

  async updateVerification(id: string, data: Partial<Verification>): Promise<Verification | undefined> {
    const [v] = await db.update(verifications).set(data).where(eq(verifications.id, id)).returning();
    return v;
  }

  async deleteVerification(id: string): Promise<void> {
    await db.delete(verificationLogs).where(eq(verificationLogs.verificationId, id));
    await db.delete(verifications).where(eq(verifications.id, id));
  }

  async addLog(data: InsertLog): Promise<VerificationLog> {
    const [l] = await db.insert(verificationLogs).values(data).returning();
    return l;
  }

  async getLogsByVerification(vid: string): Promise<VerificationLog[]> {
    return db.select().from(verificationLogs).where(eq(verificationLogs.verificationId, vid)).orderBy(desc(verificationLogs.createdAt));
  }

  async createCard(data: InsertCard): Promise<Card> {
    const [c] = await db.insert(cards).values(data).returning();
    return c;
  }

  async getCard(id: string): Promise<Card | undefined> {
    const [c] = await db.select().from(cards).where(eq(cards.id, id));
    return c;
  }

  async getAllCards(): Promise<Card[]> {
    return db.select().from(cards).orderBy(desc(cards.createdAt));
  }

  async deleteCard(id: string): Promise<void> {
    await db.delete(cards).where(eq(cards.id, id));
  }

  async getProxies(): Promise<Proxy[]> {
    return db.select().from(proxies).orderBy(desc(proxies.isActive));
  }

  async addProxy(data: InsertProxy): Promise<Proxy> {
    const [p] = await db.insert(proxies).values(data).returning();
    return p;
  }

  async deleteProxy(id: string): Promise<void> {
    await db.delete(proxies).where(eq(proxies.id, id));
  }

  async deleteAllProxies(): Promise<number> {
    const all = await db.select().from(proxies);
    await db.delete(proxies);
    return all.length;
  }

  async deleteProxiesByIds(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      await db.delete(proxies).where(eq(proxies.id, id));
      count++;
    }
    return count;
  }

  async toggleProxy(id: string, active: boolean): Promise<void> {
    await db.update(proxies).set({ isActive: active }).where(eq(proxies.id, id));
  }

  async updateProxy(id: string, data: Partial<Proxy>): Promise<Proxy | undefined> {
    const [p] = await db.update(proxies).set(data).where(eq(proxies.id, id)).returning();
    return p;
  }

  async getTelegramUser(telegramId: string): Promise<TelegramUser | undefined> {
    const [u] = await db.select().from(telegramUsers).where(eq(telegramUsers.telegramId, telegramId));
    return u;
  }

  async createTelegramUser(data: InsertTelegramUser): Promise<TelegramUser> {
    const [u] = await db.insert(telegramUsers).values(data).returning();
    return u;
  }

  async updateTelegramUserCredits(telegramId: string, delta: number): Promise<TelegramUser | undefined> {
    const [u] = await db.update(telegramUsers)
      .set({ credits: sql`${telegramUsers.credits} + ${delta}` })
      .where(eq(telegramUsers.telegramId, telegramId))
      .returning();
    return u;
  }

  async setTelegramUserCredits(telegramId: string, credits: number): Promise<TelegramUser | undefined> {
    const [u] = await db.update(telegramUsers)
      .set({ credits })
      .where(eq(telegramUsers.telegramId, telegramId))
      .returning();
    return u;
  }

  async setVip(telegramId: string, expiresAt: Date): Promise<void> {
    await db.update(telegramUsers)
      .set({ isVip: true, vipExpiresAt: expiresAt })
      .where(eq(telegramUsers.telegramId, telegramId));
  }

  async removeVip(telegramId: string): Promise<void> {
    await db.update(telegramUsers)
      .set({ isVip: false, vipExpiresAt: null })
      .where(eq(telegramUsers.telegramId, telegramId));
  }

  async getAllTelegramUsers(): Promise<TelegramUser[]> {
    return db.select().from(telegramUsers).orderBy(desc(telegramUsers.createdAt));
  }

  async banTelegramUser(telegramId: string, banned: boolean): Promise<void> {
    await db.update(telegramUsers)
      .set({ isBanned: banned })
      .where(eq(telegramUsers.telegramId, telegramId));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [p] = await db.insert(payments).values(data).returning();
    return p;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [p] = await db.select().from(payments).where(eq(payments.id, id));
    return p;
  }

  async getPendingPayments(): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.status, "pending")).orderBy(desc(payments.createdAt));
  }

  async getPaymentsByUser(telegramId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.telegramId, telegramId)).orderBy(desc(payments.createdAt));
  }

  async updatePaymentStatus(id: string, status: string, txHash?: string): Promise<Payment | undefined> {
    const updates: any = { status };
    if (txHash) updates.txHash = txHash;
    const [p] = await db.update(payments).set(updates).where(eq(payments.id, id)).returning();
    return p;
  }

  async addCreditTransaction(data: InsertCreditTransaction): Promise<CreditTransaction> {
    const [t] = await db.insert(creditTransactions).values(data).returning();
    return t;
  }

  async getCreditTransactions(telegramId: string): Promise<CreditTransaction[]> {
    return db.select().from(creditTransactions).where(eq(creditTransactions.telegramId, telegramId)).orderBy(desc(creditTransactions.createdAt));
  }

  async getTelegramUserByReferralCode(code: string): Promise<TelegramUser | undefined> {
    const [u] = await db.select().from(telegramUsers).where(eq(telegramUsers.referralCode, code));
    return u;
  }

  async updateTelegramUser(telegramId: string, data: Partial<TelegramUser>): Promise<TelegramUser | undefined> {
    const [u] = await db.update(telegramUsers).set(data).where(eq(telegramUsers.telegramId, telegramId)).returning();
    return u;
  }

  async getUniversitySettings(): Promise<UniversitySetting[]> {
    return db.select().from(universitySettings);
  }

  async setUniversitySetting(universityId: number, enabled: boolean): Promise<void> {
    await db
      .insert(universitySettings)
      .values({ universityId, enabled })
      .onConflictDoUpdate({
        target: universitySettings.universityId,
        set: { enabled },
      });
  }

  async getTemplateSettings(): Promise<TemplateSetting[]> {
    return db.select().from(templateSettings);
  }

  async setTemplateSetting(templateId: string, enabled: boolean): Promise<void> {
    await db
      .insert(templateSettings)
      .values({ templateId, enabled })
      .onConflictDoUpdate({
        target: templateSettings.templateId,
        set: { enabled },
      });
  }

  async getTelegramBots(): Promise<TelegramBot[]> {
    return db.select().from(telegramBots).orderBy(desc(telegramBots.createdAt));
  }

  async getTelegramBot(id: string): Promise<TelegramBot | undefined> {
    const [b] = await db.select().from(telegramBots).where(eq(telegramBots.id, id));
    return b;
  }

  async createTelegramBot(data: InsertTelegramBot): Promise<TelegramBot> {
    const [b] = await db.insert(telegramBots).values(data).returning();
    return b;
  }

  async updateTelegramBot(id: string, data: Partial<TelegramBot>): Promise<TelegramBot | undefined> {
    const [b] = await db.update(telegramBots).set(data).where(eq(telegramBots.id, id)).returning();
    return b;
  }

  async deleteTelegramBot(id: string): Promise<void> {
    await db.delete(telegramBots).where(eq(telegramBots.id, id));
  }

  async getBotSettings(): Promise<BotSetting[]> {
    return db.select().from(botSettings);
  }

  async getBotSetting(key: string): Promise<string | undefined> {
    const [s] = await db.select().from(botSettings).where(eq(botSettings.key, key));
    return s?.value;
  }

  async setBotSetting(key: string, value: string): Promise<void> {
    await db
      .insert(botSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: botSettings.key,
        set: { value },
      });
  }

  async deleteBotSetting(key: string): Promise<void> {
    await db.delete(botSettings).where(eq(botSettings.key, key));
  }
}

export const storage = new DatabaseStorage();
