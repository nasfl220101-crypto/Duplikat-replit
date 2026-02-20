import { Bot, InlineKeyboard } from "grammy";
import { storage } from "./storage";
import { runVerification } from "./verifier";
import type { TelegramBot as TelegramBotRecord } from "@shared/schema";

const CHANNEL_LINK = "https://t.me/sheerIDinfo";
const CHANNEL_ID = "@sheerIDinfo";
const GROUP_LINK = "https://t.me/bestinfoSheerId";
const GROUP_ID = "@bestinfoSheerId";

const WALLETS: Record<string, { address: string; name: string }> = {
  bep20: { address: "0xed0760da59b38f8d126afee7bca2f7e67a10e13a", name: "BSC (BEP20)" },
  trc20: { address: "TXroAG72kgt7DsjdaqYx289q7c4nG6k5zf", name: "Tron (TRC20)" },
  ton: { address: "UQB0_awsoZipuy_ORdUNk8vWPEk6-aW5BJ5vYcfPBItSFmNz", name: "TON" },
  btc: { address: "14UtPQX2QBe2zXkbQ4ikFewB1xkEDdMR4U", name: "BTC" },
};

const PACKAGES = [
  { id: "p1", label: "$2 — 5 Credits", price: "2", credits: 5 },
  { id: "p2", label: "$5 — 15 Credits", price: "5", credits: 15 },
  { id: "p3", label: "$10 — 33 Credits", price: "10", credits: 33 },
  { id: "p4", label: "$15 — 50 Credits", price: "15", credits: 50 },
  { id: "vip", label: "$30 — VIP 2 Weeks", price: "30", credits: 0 },
];

const CHECKIN_CREDITS = 0.3;
const REFERRAL_CREDITS = 0.1;

const activeBotInstances = new Map<string, Bot>();
const activeVerifications = new Map<string, string>();
const pendingPayments = new Map<string, { packageId: string; network: string; paymentDbId: string }>();

async function getAdminIds(): Promise<string[]> {
  const settings = await storage.getBotSettings();
  const adminSetting = settings.find(s => s.key === "admin_ids");
  if (!adminSetting) return [];
  return adminSetting.value.split(",").map(s => s.trim()).filter(Boolean);
}

async function isAdmin(userId: string): Promise<boolean> {
  const ids = await getAdminIds();
  return ids.includes(userId);
}

function generateReferralCode(telegramId: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  const seed = parseInt(telegramId);
  for (let i = 0; i < 8; i++) {
    code += chars[(seed * (i + 7) + i * 31) % chars.length];
  }
  return code;
}

function mainMenu() {
  return new InlineKeyboard()
    .text("Verify", "menu_verify").row()
    .text("My Credits", "menu_credits").text("History", "menu_history").row()
    .text("Top Up", "menu_topup").row()
    .text("Support", "menu_support");
}

function welcomeText(name: string, credits: number, isVip: boolean) {
  const vipBadge = isVip ? "  [ VIP ]" : "";
  return [
    `━━━━━━━━━━━━━━━━━━━━`,
    `   SHEERID VERIFICATION BOT`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Welcome, ${name}!${vipBadge}`,
    ``,
    `Credits: ${isVip ? "UNLIMITED" : credits}`,
    ``,
    `Automate your SheerID student`,
    `verification with one click.`,
    ``,
    `Select an option below:`,
    `━━━━━━━━━━━━━━━━━━━━`,
  ].join("\n");
}

async function checkMembership(bot: Bot, userId: number): Promise<boolean> {
  try {
    const [channelMember, groupMember] = await Promise.all([
      bot.api.getChatMember(CHANNEL_ID, userId).catch(() => null),
      bot.api.getChatMember(GROUP_ID, userId).catch(() => null),
    ]);
    const inChannel = channelMember && !["left", "kicked"].includes(channelMember.status);
    const inGroup = groupMember && !["left", "kicked"].includes(groupMember.status);
    return !!(inChannel && inGroup);
  } catch {
    return false;
  }
}

async function requireJoin(bot: Bot, ctx: any): Promise<boolean> {
  const userId = ctx.from!.id;
  const isInGroup = await checkMembership(bot, userId);

  if (!isInGroup) {
    const kb = new InlineKeyboard()
      .url("Join Channel", CHANNEL_LINK).row()
      .url("Join Group", GROUP_LINK).row()
      .text("I've Joined", "check_join");

    const text = [
      `━━━━━━━━━━━━━━━━━━━━`,
      `   JOIN REQUIRED`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `You must join our channel AND`,
      `group before using this bot.`,
      ``,
      `1. Join the channel`,
      `2. Join the group`,
      `3. Press "I've Joined"`,
      `━━━━━━━━━━━━━━━━━━━━`,
    ].join("\n");

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(text, { reply_markup: kb });
      } catch {
        await ctx.reply(text, { reply_markup: kb });
      }
    } else {
      await ctx.reply(text, { reply_markup: kb });
    }
    return false;
  }
  return true;
}

async function ensureUser(telegramId: string, username?: string, firstName?: string) {
  let user = await storage.getTelegramUser(telegramId);
  if (!user) {
    const refCode = generateReferralCode(telegramId);
    user = await storage.createTelegramUser({
      telegramId,
      username: username || null,
      firstName: firstName || null,
      credits: 1,
      isVip: false,
      isBanned: false,
      referralCode: refCode,
      referredBy: null,
      referralCount: 0,
      lastCheckIn: null,
    });
    await storage.addCreditTransaction({
      telegramId,
      amount: 1,
      type: "welcome",
      description: "Welcome bonus - 1 free credit",
    });
  } else {
    if (!user.referralCode) {
      const refCode = generateReferralCode(telegramId);
      await storage.updateTelegramUser(telegramId, { referralCode: refCode });
      user = await storage.getTelegramUser(telegramId);
    }
  }
  if (user!.isVip && user!.vipExpiresAt && new Date(user!.vipExpiresAt) < new Date()) {
    await storage.removeVip(telegramId);
    user = await storage.getTelegramUser(telegramId);
  }
  return user!;
}

function registerBotHandlers(bot: Bot, botUsername: string) {
  bot.command("start", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;

    const args = ctx.match;
    const user = await ensureUser(tgId, ctx.from!.username, ctx.from!.first_name);

    if (args && args.startsWith("ref_") && !user.referredBy) {
      const refCode = args.replace("ref_", "");
      const referrer = await storage.getTelegramUserByReferralCode(refCode);
      if (referrer && referrer.telegramId !== tgId) {
        await storage.updateTelegramUser(tgId, { referredBy: referrer.telegramId });
        await storage.updateTelegramUserCredits(referrer.telegramId, REFERRAL_CREDITS);
        await storage.updateTelegramUser(referrer.telegramId, { referralCount: referrer.referralCount + 1 });
        await storage.addCreditTransaction({
          telegramId: referrer.telegramId,
          amount: REFERRAL_CREDITS,
          type: "referral",
          description: `Referral bonus from ${ctx.from!.username || tgId}`,
        });
        try {
          await bot.api.sendMessage(
            parseInt(referrer.telegramId),
            `You earned ${REFERRAL_CREDITS} credit! ${ctx.from!.username ? "@" + ctx.from!.username : "Someone"} joined using your referral link.`
          );
        } catch {}
      }
    }

    await ctx.reply(welcomeText(ctx.from!.first_name || "User", user.credits, user.isVip), {
      reply_markup: mainMenu(),
    });
  });

  bot.callbackQuery("check_join", async (ctx) => {
    await ctx.answerCallbackQuery();
    const joined = await requireJoin(bot, ctx);
    if (!joined) {
      await ctx.answerCallbackQuery({ text: "You haven't joined yet! Join both channel and group first.", show_alert: true });
      return;
    }
    const tgId = ctx.from.id.toString();
    const user = await ensureUser(tgId, ctx.from.username, ctx.from.first_name);
    await ctx.editMessageText(welcomeText(ctx.from.first_name || "User", user.credits, user.isVip), {
      reply_markup: mainMenu(),
    });
  });

  bot.callbackQuery("main_menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const tgId = ctx.from.id.toString();
    const user = await ensureUser(tgId, ctx.from.username, ctx.from.first_name);
    await ctx.editMessageText(welcomeText(ctx.from.first_name || "User", user.credits, user.isVip), {
      reply_markup: mainMenu(),
    });
  });

  bot.command("verify", async (ctx) => {
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const tgId = ctx.from!.id.toString();
    const user = await ensureUser(tgId);

    if (user.isBanned) {
      await ctx.reply("Your account has been banned. Contact support.");
      return;
    }
    if (!user.isVip && user.credits <= 0) {
      await ctx.reply(
        [
          `━━━━━━━━━━━━━━━━━━━━`,
          `   NO CREDITS`,
          `━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `You have no credits left.`,
          `Use /topup to purchase more.`,
          ``,
          `Credits only deducted on success.`,
          `━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n")
      );
      return;
    }
    if (activeVerifications.has(tgId)) {
      await ctx.reply("You already have a verification in progress. Please wait.");
      return;
    }

    activeVerifications.set(tgId, "awaiting_link");
    await ctx.reply(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   START VERIFICATION`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Send your SheerID verification`,
        `link to begin the process.`,
        ``,
        `Example:`,
        `https://verify.sheerid.com/...`,
        ``,
        `Credits: ${user.isVip ? "UNLIMITED (VIP)" : user.credits}`,
        `Only deducted if successful.`,
        ``,
        `Use /cancel to abort.`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n")
    );
  });

  bot.callbackQuery("menu_verify", async (ctx) => {
    await ctx.answerCallbackQuery();
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const tgId = ctx.from.id.toString();
    const user = await ensureUser(tgId);

    if (user.isBanned) {
      await ctx.editMessageText("Your account has been banned. Contact support.", {
        reply_markup: new InlineKeyboard().text("Back", "main_menu"),
      });
      return;
    }
    if (!user.isVip && user.credits <= 0) {
      await ctx.editMessageText(
        [
          `━━━━━━━━━━━━━━━━━━━━`,
          `   NO CREDITS`,
          `━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `You have no credits left.`,
          `Purchase credits to continue.`,
          ``,
          `Credits only deducted on success.`,
          `━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n"),
        { reply_markup: new InlineKeyboard().text("Top Up", "menu_topup").row().text("Back", "main_menu") }
      );
      return;
    }
    if (activeVerifications.has(tgId)) {
      await ctx.editMessageText("You already have a verification in progress. Please wait.", {
        reply_markup: new InlineKeyboard().text("Back", "main_menu"),
      });
      return;
    }

    activeVerifications.set(tgId, "awaiting_link");
    await ctx.editMessageText(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   START VERIFICATION`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Send your SheerID verification`,
        `link to begin the process.`,
        ``,
        `Example:`,
        `https://verify.sheerid.com/...`,
        ``,
        `Credits: ${user.isVip ? "UNLIMITED (VIP)" : user.credits}`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n"),
      { reply_markup: new InlineKeyboard().text("Cancel", "main_menu") }
    );
  });

  bot.command("topup", async (ctx) => {
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const kb = new InlineKeyboard();
    for (const pkg of PACKAGES) {
      kb.text(pkg.label, `pkg_${pkg.id}`).row();
    }
    await ctx.reply(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   TOP UP CREDITS`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Select a package below.`,
        `Payment via USDT / BTC.`,
        ``,
        `Credits only deducted on success.`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n"),
      { reply_markup: kb }
    );
  });

  bot.command("profile", async (ctx) => {
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const tgId = ctx.from!.id.toString();
    const user = await ensureUser(tgId, ctx.from!.username, ctx.from!.first_name);
    const transactions = await storage.getCreditTransactions(tgId);
    const successCount = transactions.filter(t => t.type === "verify_success").length;
    const totalSpent = transactions.filter(t => t.type === "topup").reduce((s, t) => s + t.amount, 0);

    await ctx.reply(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   YOUR PROFILE`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Name: ${user.firstName || "N/A"}`,
        `Username: ${user.username ? "@" + user.username : "N/A"}`,
        `ID: ${user.telegramId}`,
        ``,
        `Credits: ${user.isVip ? "UNLIMITED (VIP)" : user.credits}`,
        user.isVip && user.vipExpiresAt ? `VIP Until: ${new Date(user.vipExpiresAt).toLocaleDateString()}` : "",
        ``,
        `Successful Verifications: ${successCount}`,
        `Credits Purchased: ${totalSpent}`,
        `Referrals: ${user.referralCount}`,
        `Referral Code: ${user.referralCode || "N/A"}`,
        ``,
        `Joined: ${new Date(user.createdAt).toLocaleDateString()}`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].filter(Boolean).join("\n")
    );
  });

  bot.command("checkin", async (ctx) => {
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const tgId = ctx.from!.id.toString();
    const user = await ensureUser(tgId, ctx.from!.username, ctx.from!.first_name);

    const now = new Date();
    if (user.lastCheckIn) {
      const last = new Date(user.lastCheckIn);
      const hoursDiff = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        const nextCheckin = new Date(last.getTime() + 24 * 60 * 60 * 1000);
        const hoursLeft = Math.ceil((nextCheckin.getTime() - now.getTime()) / (1000 * 60 * 60));
        await ctx.reply(
          [
            `━━━━━━━━━━━━━━━━━━━━`,
            `   ALREADY CHECKED IN`,
            `━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `You already checked in today!`,
            `Come back in ${hoursLeft} hour${hoursLeft > 1 ? "s" : ""}.`,
            `━━━━━━━━━━━━━━━━━━━━`,
          ].join("\n")
        );
        return;
      }
    }

    await storage.updateTelegramUser(tgId, { lastCheckIn: now });
    await storage.updateTelegramUserCredits(tgId, CHECKIN_CREDITS);
    await storage.addCreditTransaction({
      telegramId: tgId,
      amount: CHECKIN_CREDITS,
      type: "checkin",
      description: "Daily check-in bonus",
    });

    const updated = await storage.getTelegramUser(tgId);

    await ctx.reply(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   DAILY CHECK-IN`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `+${CHECKIN_CREDITS} credits added!`,
        ``,
        `Balance: ${updated!.credits} credits`,
        ``,
        `Come back tomorrow for more!`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n")
    );
  });

  bot.command("referral", async (ctx) => {
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const tgId = ctx.from!.id.toString();
    const user = await ensureUser(tgId, ctx.from!.username, ctx.from!.first_name);

    const refLink = `https://t.me/${botUsername}?start=ref_${user.referralCode}`;

    await ctx.reply(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   REFERRAL PROGRAM`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Share your referral link and`,
        `earn ${REFERRAL_CREDITS} credit for each new user!`,
        ``,
        `Your link:`,
        refLink,
        ``,
        `Referral code: ${user.referralCode}`,
        `Total referrals: ${user.referralCount}`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n")
    );
  });

  bot.callbackQuery("menu_credits", async (ctx) => {
    await ctx.answerCallbackQuery();
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const tgId = ctx.from.id.toString();
    const user = await ensureUser(tgId);
    const transactions = await storage.getCreditTransactions(tgId);
    const recent = transactions.slice(0, 5);
    let historyText = recent.length > 0
      ? recent.map((t) => {
          const sign = t.amount > 0 ? "+" : "";
          const d = new Date(t.createdAt).toLocaleDateString();
          return `  ${sign}${t.amount}  ${t.description || t.type} (${d})`;
        }).join("\n")
      : "  No transactions yet";

    await ctx.editMessageText(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   MY CREDITS`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Balance: ${user.isVip ? "UNLIMITED (VIP)" : user.credits}`,
        user.isVip && user.vipExpiresAt ? `VIP expires: ${new Date(user.vipExpiresAt).toLocaleDateString()}` : "",
        ``,
        `Recent Transactions:`,
        historyText,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].filter(Boolean).join("\n"),
      { reply_markup: new InlineKeyboard().text("Top Up", "menu_topup").row().text("Back", "main_menu") }
    );
  });

  bot.callbackQuery("menu_history", async (ctx) => {
    await ctx.answerCallbackQuery();
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const tgId = ctx.from.id.toString();
    const verifs = await storage.getCreditTransactions(tgId);
    const verifTxs = verifs.filter((t) => t.type === "verify_success" || t.type === "verification").slice(0, 10);

    let text: string;
    if (verifTxs.length === 0) {
      text = [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   VERIFICATION HISTORY`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `No verifications yet.`,
        `Start one with /verify`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n");
    } else {
      const lines = verifTxs.map((t) => {
        const d = new Date(t.createdAt).toLocaleDateString();
        return `  ${t.description} (${d})`;
      });
      text = [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   VERIFICATION HISTORY`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        ...lines,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n");
    }

    await ctx.editMessageText(text, {
      reply_markup: new InlineKeyboard().text("Back", "main_menu"),
    });
  });

  bot.callbackQuery("menu_topup", async (ctx) => {
    await ctx.answerCallbackQuery();
    const joined = await requireJoin(bot, ctx);
    if (!joined) return;
    const kb = new InlineKeyboard();
    for (const pkg of PACKAGES) {
      kb.text(pkg.label, `pkg_${pkg.id}`).row();
    }
    kb.text("Back", "main_menu");

    await ctx.editMessageText(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   TOP UP CREDITS`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Select a package below.`,
        `Payment via USDT / BTC.`,
        ``,
        `Credits only deducted on success.`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n"),
      { reply_markup: kb }
    );
  });

  for (const pkg of PACKAGES) {
    bot.callbackQuery(`pkg_${pkg.id}`, async (ctx) => {
      await ctx.answerCallbackQuery();
      const kb = new InlineKeyboard()
        .text("BSC (BEP20)", `net_${pkg.id}_bep20`).row()
        .text("Tron (TRC20)", `net_${pkg.id}_trc20`).row()
        .text("TON", `net_${pkg.id}_ton`).row()
        .text("BTC", `net_${pkg.id}_btc`).row()
        .text("Back", "menu_topup");

      const desc = pkg.id === "vip" ? "Unlimited verifications for 2 weeks" : `${pkg.credits} credits`;

      await ctx.editMessageText(
        [
          `━━━━━━━━━━━━━━━━━━━━`,
          `   PAYMENT — ${pkg.label}`,
          `━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `Package: ${desc}`,
          `Price: $${pkg.price} USD`,
          ``,
          `Select payment network:`,
          `━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n"),
        { reply_markup: kb }
      );
    });
  }

  const networkRegex = /^net_(.+)_(bep20|trc20|ton|btc)$/;

  bot.callbackQuery(networkRegex, async (ctx) => {
    await ctx.answerCallbackQuery();
    const match = ctx.callbackQuery.data!.match(networkRegex)!;
    const pkgId = match[1];
    const network = match[2];
    const pkg = PACKAGES.find((p) => p.id === pkgId)!;
    const wallet = WALLETS[network];
    const tgId = ctx.from.id.toString();

    const payment = await storage.createPayment({
      telegramId: tgId,
      packageName: pkg.label,
      amountUsd: pkg.price,
      credits: pkg.credits,
      network: wallet.name,
      status: "pending",
    });

    pendingPayments.set(tgId, { packageId: pkgId, network, paymentDbId: payment.id });

    await ctx.editMessageText(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   PAYMENT DETAILS`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Package: ${pkg.label}`,
        `Network: ${wallet.name}`,
        `Amount: $${pkg.price} USD`,
        ``,
        `Send payment to:`,
        ``,
        `\`${wallet.address}\``,
        ``,
        `After payment, send your`,
        `TX hash here to confirm.`,
        ``,
        `Order ID: ${payment.id.slice(0, 8)}`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n"),
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().text("Cancel", "main_menu") }
    );
  });

  bot.callbackQuery("menu_support", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   SUPPORT`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Need help? Join our group:`,
        GROUP_LINK,
        ``,
        `Or contact the admin directly.`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n"),
      { reply_markup: new InlineKeyboard().text("Back", "main_menu") }
    );
  });

  bot.command("admin", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    if (!(await isAdmin(tgId))) return;
    const kb = new InlineKeyboard()
      .text("Pending Payments", "adm_pending").row()
      .text("All Users", "adm_users").row()
      .text("Stats", "adm_stats").row()
      .text("Broadcast", "adm_broadcast");
    await ctx.reply(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   ADMIN PANEL`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Select an option:`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n"),
      { reply_markup: kb }
    );
  });

  bot.callbackQuery("adm_pending", async (ctx) => {
    if (!(await isAdmin(ctx.from.id.toString()))) return;
    await ctx.answerCallbackQuery();
    const pending = await storage.getPendingPayments();
    if (pending.length === 0) {
      await ctx.editMessageText("No pending payments.", {
        reply_markup: new InlineKeyboard().text("Admin Menu", "adm_back"),
      });
      return;
    }
    let text = `━━ PENDING PAYMENTS (${pending.length}) ━━\n\n`;
    const kb = new InlineKeyboard();
    for (const p of pending.slice(0, 10)) {
      const d = new Date(p.createdAt).toLocaleDateString();
      text += `ID: ${p.id.slice(0, 8)}\nUser: ${p.telegramId}\nPkg: ${p.packageName}\nNetwork: ${p.network}\nTX: ${p.txHash || "none"}\nDate: ${d}\n\n`;
      kb.text(`Approve ${p.id.slice(0, 8)}`, `adm_approve_${p.id}`).text(`Reject ${p.id.slice(0, 8)}`, `adm_reject_${p.id}`).row();
    }
    kb.text("Admin Menu", "adm_back");
    await ctx.editMessageText(text, { reply_markup: kb });
  });

  bot.callbackQuery(/^adm_approve_(.+)$/, async (ctx) => {
    if (!(await isAdmin(ctx.from.id.toString()))) return;
    await ctx.answerCallbackQuery();
    const paymentId = ctx.callbackQuery.data!.replace("adm_approve_", "");
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      await ctx.answerCallbackQuery({ text: "Payment not found", show_alert: true });
      return;
    }
    await storage.updatePaymentStatus(paymentId, "approved");
    const pkg = PACKAGES.find((p) => p.label === payment.packageName);
    if (pkg && pkg.id === "vip") {
      const expires = new Date();
      expires.setDate(expires.getDate() + 14);
      await storage.setVip(payment.telegramId, expires);
      await storage.addCreditTransaction({
        telegramId: payment.telegramId,
        amount: 0,
        type: "vip_purchase",
        description: "VIP 2 Weeks activated",
      });
    } else if (pkg) {
      await storage.updateTelegramUserCredits(payment.telegramId, pkg.credits);
      await storage.addCreditTransaction({
        telegramId: payment.telegramId,
        amount: pkg.credits,
        type: "topup",
        description: `Top up: ${pkg.label}`,
      });
    }

    try {
      const creditMsg = pkg?.id === "vip" ? "VIP 2 Weeks activated!" : `${pkg?.credits} credits added!`;
      await bot.api.sendMessage(
        parseInt(payment.telegramId),
        [
          `━━━━━━━━━━━━━━━━━━━━`,
          `   PAYMENT APPROVED`,
          `━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `Your payment has been confirmed!`,
          creditMsg,
          ``,
          `Thank you for your purchase.`,
          `━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n"),
        { reply_markup: mainMenu() }
      );
    } catch {}

    await ctx.editMessageText(`Payment ${paymentId.slice(0, 8)} APPROVED.`, {
      reply_markup: new InlineKeyboard().text("Pending", "adm_pending").text("Admin", "adm_back"),
    });
  });

  bot.callbackQuery(/^adm_reject_(.+)$/, async (ctx) => {
    if (!(await isAdmin(ctx.from.id.toString()))) return;
    await ctx.answerCallbackQuery();
    const paymentId = ctx.callbackQuery.data!.replace("adm_reject_", "");
    await storage.updatePaymentStatus(paymentId, "rejected");
    const payment = await storage.getPayment(paymentId);
    if (payment) {
      try {
        await bot.api.sendMessage(
          parseInt(payment.telegramId),
          [
            `━━━━━━━━━━━━━━━━━━━━`,
            `   PAYMENT REJECTED`,
            `━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `Your payment could not be verified.`,
            `Contact support if this is an error.`,
            `━━━━━━━━━━━━━━━━━━━━`,
          ].join("\n"),
          { reply_markup: mainMenu() }
        );
      } catch {}
    }
    await ctx.editMessageText(`Payment ${paymentId.slice(0, 8)} REJECTED.`, {
      reply_markup: new InlineKeyboard().text("Pending", "adm_pending").text("Admin", "adm_back"),
    });
  });

  bot.callbackQuery("adm_users", async (ctx) => {
    if (!(await isAdmin(ctx.from.id.toString()))) return;
    await ctx.answerCallbackQuery();
    const users = await storage.getAllTelegramUsers();
    let text = `━━ USERS (${users.length}) ━━\n\n`;
    for (const u of users.slice(0, 20)) {
      const vip = u.isVip ? " [VIP]" : "";
      const banned = u.isBanned ? " [BANNED]" : "";
      text += `@${u.username || "no_username"} | ID: ${u.telegramId} | Cr: ${u.credits}${vip}${banned}\n`;
    }
    await ctx.editMessageText(text, {
      reply_markup: new InlineKeyboard().text("Admin Menu", "adm_back"),
    });
  });

  bot.callbackQuery("adm_stats", async (ctx) => {
    if (!(await isAdmin(ctx.from.id.toString()))) return;
    await ctx.answerCallbackQuery();
    const users = await storage.getAllTelegramUsers();
    const allVerif = await storage.getAllVerifications();
    const success = allVerif.filter((v) => v.status === "success").length;
    const failed = allVerif.filter((v) => v.status === "failed").length;
    const payments = await storage.getPendingPayments();

    await ctx.editMessageText(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   BOT STATISTICS`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Total Users: ${users.length}`,
        `VIP Users: ${users.filter((u) => u.isVip).length}`,
        ``,
        `Verifications: ${allVerif.length}`,
        `  Successful: ${success}`,
        `  Failed: ${failed}`,
        `  Rate: ${allVerif.length ? Math.round((success / allVerif.length) * 100) : 0}%`,
        ``,
        `Pending Payments: ${payments.length}`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n"),
      { reply_markup: new InlineKeyboard().text("Admin Menu", "adm_back") }
    );
  });

  bot.callbackQuery("adm_broadcast", async (ctx) => {
    if (!(await isAdmin(ctx.from.id.toString()))) return;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   BROADCAST MESSAGE`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Send your broadcast message now.`,
        `It will be sent to all users.`,
        ``,
        `Use /cancel to abort.`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n")
    );
    const adminIds = await getAdminIds();
    for (const adminId of adminIds) {
      activeVerifications.set(adminId, "awaiting_broadcast");
    }
  });

  bot.callbackQuery("adm_back", async (ctx) => {
    if (!(await isAdmin(ctx.from.id.toString()))) return;
    await ctx.answerCallbackQuery();
    const kb = new InlineKeyboard()
      .text("Pending Payments", "adm_pending").row()
      .text("All Users", "adm_users").row()
      .text("Stats", "adm_stats").row()
      .text("Broadcast", "adm_broadcast");
    await ctx.editMessageText(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   ADMIN PANEL`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Select an option:`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n"),
      { reply_markup: kb }
    );
  });

  bot.command("addcredits", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    if (!(await isAdmin(tgId))) return;
    const args = ctx.message!.text!.split(" ").slice(1);
    if (args.length < 2) {
      await ctx.reply("Usage: /addcredits <user_id> <amount>");
      return;
    }
    const [targetId, amountStr] = args;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      await ctx.reply("Invalid amount.");
      return;
    }
    const user = await storage.updateTelegramUserCredits(targetId, amount);
    if (!user) {
      await ctx.reply(`User ${targetId} not found.`);
      return;
    }
    await storage.addCreditTransaction({
      telegramId: targetId,
      amount,
      type: "admin_add",
      description: `Admin added ${amount} credits`,
    });
    await ctx.reply(`Added ${amount} credits to ${targetId}. New balance: ${user.credits}`);
    try {
      await bot.api.sendMessage(parseInt(targetId), `You received ${amount} credits from admin. Balance: ${user.credits}`);
    } catch {}
  });

  bot.command("setcredits", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    if (!(await isAdmin(tgId))) return;
    const args = ctx.message!.text!.split(" ").slice(1);
    if (args.length < 2) {
      await ctx.reply("Usage: /setcredits <user_id> <amount>");
      return;
    }
    const [targetId, amountStr] = args;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      await ctx.reply("Invalid amount.");
      return;
    }
    const user = await storage.setTelegramUserCredits(targetId, amount);
    if (!user) {
      await ctx.reply(`User ${targetId} not found.`);
      return;
    }
    await storage.addCreditTransaction({
      telegramId: targetId,
      amount,
      type: "admin_set",
      description: `Admin set credits to ${amount}`,
    });
    await ctx.reply(`Set credits for ${targetId} to ${amount}.`);
  });

  bot.command("setvip", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    if (!(await isAdmin(tgId))) return;
    const args = ctx.message!.text!.split(" ").slice(1);
    if (args.length < 2) {
      await ctx.reply("Usage: /setvip <user_id> <days>");
      return;
    }
    const [targetId, daysStr] = args;
    const days = parseInt(daysStr);
    if (isNaN(days) || days < 1) {
      await ctx.reply("Invalid number of days.");
      return;
    }
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    await storage.setVip(targetId, expires);
    await ctx.reply(`VIP activated for ${targetId} for ${days} days (expires ${expires.toLocaleDateString()}).`);
    try {
      await bot.api.sendMessage(parseInt(targetId), `You've been granted VIP for ${days} days! Enjoy unlimited verifications.`);
    } catch {}
  });

  bot.command("removevip", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    if (!(await isAdmin(tgId))) return;
    const args = ctx.message!.text!.split(" ").slice(1);
    if (args.length < 1) {
      await ctx.reply("Usage: /removevip <user_id>");
      return;
    }
    const targetId = args[0];
    await storage.removeVip(targetId);
    await ctx.reply(`VIP removed from ${targetId}.`);
  });

  bot.command("ban", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    if (!(await isAdmin(tgId))) return;
    const args = ctx.message!.text!.split(" ").slice(1);
    if (args.length < 1) {
      await ctx.reply("Usage: /ban <user_id>");
      return;
    }
    const targetId = args[0];
    await storage.banTelegramUser(targetId, true);
    await ctx.reply(`User ${targetId} has been banned.`);
  });

  bot.command("unban", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    if (!(await isAdmin(tgId))) return;
    const args = ctx.message!.text!.split(" ").slice(1);
    if (args.length < 1) {
      await ctx.reply("Usage: /unban <user_id>");
      return;
    }
    const targetId = args[0];
    await storage.banTelegramUser(targetId, false);
    await ctx.reply(`User ${targetId} has been unbanned.`);
  });

  bot.command("users", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    if (!(await isAdmin(tgId))) return;
    const users = await storage.getAllTelegramUsers();
    if (users.length === 0) {
      await ctx.reply("No users registered.");
      return;
    }
    let text = `━━ USERS (${users.length}) ━━\n\n`;
    for (const u of users.slice(0, 30)) {
      const vip = u.isVip ? " [VIP]" : "";
      const banned = u.isBanned ? " [BAN]" : "";
      text += `${u.username ? "@" + u.username : "N/A"} | ${u.telegramId} | Cr: ${u.credits}${vip}${banned}\n`;
    }
    if (users.length > 30) text += `\n... and ${users.length - 30} more`;
    await ctx.reply(text);
  });

  bot.command("stats", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    if (!(await isAdmin(tgId))) return;
    const users = await storage.getAllTelegramUsers();
    const allVerif = await storage.getAllVerifications();
    const success = allVerif.filter((v) => v.status === "success").length;
    const failed = allVerif.filter((v) => v.status === "failed").length;
    const running = allVerif.filter((v) => v.status === "running").length;
    const review = allVerif.filter((v) => v.status === "review").length;
    const payments = await storage.getPendingPayments();
    const totalCredits = users.reduce((sum, u) => sum + u.credits, 0);

    await ctx.reply(
      [
        `━━━━━━━━━━━━━━━━━━━━`,
        `   BOT STATISTICS`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `Total Users: ${users.length}`,
        `VIP Users: ${users.filter((u) => u.isVip).length}`,
        `Banned: ${users.filter((u) => u.isBanned).length}`,
        `Total Credits: ${totalCredits}`,
        ``,
        `Verifications: ${allVerif.length}`,
        `  Success: ${success}`,
        `  Failed: ${failed}`,
        `  Running: ${running}`,
        `  Review: ${review}`,
        `  Rate: ${allVerif.length ? Math.round((success / allVerif.length) * 100) : 0}%`,
        ``,
        `Pending Payments: ${payments.length}`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ].join("\n")
    );
  });

  bot.command("cancel", async (ctx) => {
    const tgId = ctx.from!.id.toString();
    activeVerifications.delete(tgId);
    pendingPayments.delete(tgId);
    const user = await ensureUser(tgId);
    await ctx.reply(welcomeText(ctx.from!.first_name || "User", user.credits, user.isVip), {
      reply_markup: mainMenu(),
    });
  });

  bot.on("message:text", async (ctx) => {
    const tgId = ctx.from.id.toString();
    const text = ctx.message.text.trim();

    if (text.startsWith("/")) return;

    const joined = await checkMembership(bot, ctx.from.id);
    if (!joined) {
      await requireJoin(bot, ctx);
      return;
    }

    if ((await isAdmin(tgId)) && activeVerifications.get(tgId) === "awaiting_broadcast") {
      activeVerifications.delete(tgId);
      const users = await storage.getAllTelegramUsers();
      let sent = 0;
      for (const u of users) {
        try {
          await bot.api.sendMessage(parseInt(u.telegramId), text);
          sent++;
        } catch {}
      }
      await ctx.reply(`Broadcast sent to ${sent}/${users.length} users.`);
      return;
    }

    if (pendingPayments.has(tgId)) {
      const pending = pendingPayments.get(tgId)!;
      const txHash = text.trim();
      if (txHash.length < 10) {
        await ctx.reply("Invalid TX hash. Please send a valid transaction hash.");
        return;
      }

      await storage.updatePaymentStatus(pending.paymentDbId, "pending", txHash);
      pendingPayments.delete(tgId);

      const pkg = PACKAGES.find((p) => p.id === pending.packageId);

      const adminIds = await getAdminIds();
      for (const adminId of adminIds) {
        try {
          await bot.api.sendMessage(
            parseInt(adminId),
            [
              `━━ NEW PAYMENT ━━`,
              ``,
              `User: ${ctx.from.username ? "@" + ctx.from.username : tgId}`,
              `User ID: ${tgId}`,
              `Package: ${pkg?.label}`,
              `Network: ${WALLETS[pending.network]?.name}`,
              `TX Hash: ${txHash}`,
              `Order: ${pending.paymentDbId.slice(0, 8)}`,
            ].join("\n"),
            {
              reply_markup: new InlineKeyboard()
                .text("Approve", `adm_approve_${pending.paymentDbId}`)
                .text("Reject", `adm_reject_${pending.paymentDbId}`),
            }
          );
        } catch {}
      }

      await ctx.reply(
        [
          `━━━━━━━━━━━━━━━━━━━━`,
          `   TX HASH RECEIVED`,
          `━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `Your TX hash has been submitted.`,
          ``,
          `TX: ${txHash.slice(0, 20)}...`,
          ``,
          `You will be notified once your`,
          `payment is confirmed by admin.`,
          `━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n"),
        { reply_markup: mainMenu() }
      );
      return;
    }

    if (activeVerifications.get(tgId) === "awaiting_link") {
      activeVerifications.delete(tgId);

      if (!text.includes("sheerid.com") || !text.includes("verificationId=")) {
        await ctx.reply(
          [
            `━━━━━━━━━━━━━━━━━━━━`,
            `   INVALID LINK`,
            `━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `That doesn't look like a valid`,
            `SheerID verification link.`,
            ``,
            `Make sure it contains:`,
            `verificationId=...`,
            `━━━━━━━━━━━━━━━━━━━━`,
          ].join("\n"),
          { reply_markup: mainMenu() }
        );
        return;
      }

      const user = await ensureUser(tgId);
      if (!user.isVip && user.credits <= 0) {
        await ctx.reply("No credits remaining. Use /topup first!", { reply_markup: mainMenu() });
        return;
      }

      activeVerifications.set(tgId, "running");

      const statusMsg = await ctx.reply(
        [
          `━━━━━━━━━━━━━━━━━━━━`,
          `   VERIFICATION STARTED`,
          `━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `Processing your verification...`,
          `This may take up to 2 minutes.`,
          ``,
          `Please wait...`,
          `━━━━━━━━━━━━━━━━━━━━`,
        ].join("\n")
      );

      const url = text;
      const vidMatch = url.match(/verificationId=([a-f0-9]+)/i);
      if (!vidMatch) {
        activeVerifications.delete(tgId);
        await bot.api.editMessageText(ctx.chat.id, statusMsg.message_id, "Invalid verification URL.", { reply_markup: mainMenu() });
        return;
      }

      const vid = vidMatch[1];
      const record = await storage.createVerification({
        verificationId: vid,
        url,
        status: "pending",
      });

      const timeout = setTimeout(async () => {
        if (activeVerifications.get(tgId) === "running") {
          activeVerifications.delete(tgId);
          await storage.updateVerification(record.id, { status: "failed", errorMessage: "Verification timed out (120s)" });
          try {
            await bot.api.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              [
                `━━━━━━━━━━━━━━━━━━━━`,
                `   VERIFICATION FAILED`,
                `━━━━━━━━━━━━━━━━━━━━`,
                ``,
                `Status: TIMEOUT`,
                ``,
                `The verification took too long.`,
                `No credits were deducted.`,
                `Please try again.`,
                `━━━━━━━━━━━━━━━━━━━━`,
              ].join("\n"),
              { reply_markup: mainMenu() }
            );
          } catch {}
        }
      }, 120_000);

      try {
        runVerification(url, record.id).catch(() => {});

        const pollInterval = setInterval(async () => {
          try {
            const v = await storage.getVerification(record.id);
            if (!v) {
              clearInterval(pollInterval);
              clearTimeout(timeout);
              activeVerifications.delete(tgId);
              return;
            }

            if (v.status === "success") {
              clearInterval(pollInterval);
              clearTimeout(timeout);
              activeVerifications.delete(tgId);

              if (!user.isVip) {
                await storage.updateTelegramUserCredits(tgId, -1);
              }
              await storage.addCreditTransaction({
                telegramId: tgId,
                amount: -1,
                type: "verify_success",
                description: `Verification success — ${v.collegeName || "Unknown"}`,
              });

              const updatedUser = await ensureUser(tgId);

              let usedIp = "N/A";
              try {
                const logs = await storage.getLogsByVerification(record.id);
                const ipLog = logs.find(l => l.message.startsWith("IP Address:"));
                if (ipLog) usedIp = ipLog.message.split("IP Address:")[1].split("|")[0].trim();
              } catch {}

              let resultText = [
                `━━━━━━━━━━━━━━━━━━━━`,
                `   VERIFICATION SUCCESS`,
                `━━━━━━━━━━━━━━━━━━━━`,
                ``,
                `Status: SUCCESS`,
                `College: ${v.collegeName || "N/A"}`,
                `Student: ${v.studentName || "N/A"}`,
                `IP Used: ${usedIp}`,
              ];
              if (v.redirectUrl) {
                resultText.push(``, `Redirect URL:`, v.redirectUrl);
              }
              resultText.push(
                ``,
                `Credits remaining: ${updatedUser.isVip ? "UNLIMITED" : updatedUser.credits}`,
                `━━━━━━━━━━━━━━━━━━━━`
              );

              try {
                await bot.api.editMessageText(ctx.chat.id, statusMsg.message_id, resultText.join("\n"), { reply_markup: mainMenu() });
              } catch {}
              return;
            }

            if (v.status === "failed") {
              clearInterval(pollInterval);
              clearTimeout(timeout);
              activeVerifications.delete(tgId);

              let usedIp = "N/A";
              try {
                const logs = await storage.getLogsByVerification(record.id);
                const ipLog = logs.find(l => l.message.startsWith("IP Address:"));
                if (ipLog) usedIp = ipLog.message.split("IP Address:")[1].split("|")[0].trim();
              } catch {}

              const isFraud = v.errorMessage?.toLowerCase().includes("fraud");
              let resultText = [
                `━━━━━━━━━━━━━━━━━━━━`,
                `   VERIFICATION FAILED`,
                `━━━━━━━━━━━━━━━━━━━━`,
                ``,
                `Status: ${isFraud ? "FRAUD DETECTED" : "FAILED"}`,
                `IP Used: ${usedIp}`,
              ];
              if (v.errorMessage) {
                resultText.push(`Reason: ${v.errorMessage}`);
              }
              if (isFraud) {
                resultText.push(
                  ``,
                  `Tip: Try using a high-quality`,
                  `residential VPN or proxy.`
                );
              }
              resultText.push(``, `No credits were deducted.`, `━━━━━━━━━━━━━━━━━━━━`);

              try {
                await bot.api.editMessageText(ctx.chat.id, statusMsg.message_id, resultText.join("\n"), { reply_markup: mainMenu() });
              } catch {}
              return;
            }
          } catch {}
        }, 3000);
      } catch (err: any) {
        clearTimeout(timeout);
        activeVerifications.delete(tgId);
        await bot.api.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          [
            `━━━━━━━━━━━━━━━━━━━━`,
            `   VERIFICATION ERROR`,
            `━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `An unexpected error occurred.`,
            `No credits were deducted.`,
            ``,
            `Error: ${err.message || "Unknown"}`,
            `━━━━━━━━━━━━━━━━━━━━`,
          ].join("\n"),
          { reply_markup: mainMenu() }
        );
      }

      return;
    }

    const user = await ensureUser(tgId, ctx.from.username, ctx.from.first_name);
    await ctx.reply(welcomeText(ctx.from.first_name || "User", user.credits, user.isVip), {
      reply_markup: mainMenu(),
    });
  });

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`[BOT] Error for ${ctx.update.update_id}:`, err.error);
  });
}

async function launchBotInstance(dbBot: TelegramBotRecord): Promise<void> {
  if (activeBotInstances.has(dbBot.id)) {
    console.log(`[BOT] Bot ${dbBot.id} (${dbBot.label}) already running, skipping`);
    return;
  }

  const botInstance = new Bot(dbBot.token);

  try {
    const me = await botInstance.api.getMe();
    const username = me.username || dbBot.label;

    await storage.updateTelegramBot(dbBot.id, { username, status: "running" });
    console.log(`[BOT] Validated token for @${username}`);

    try {
      await botInstance.api.setMyCommands([
        { command: "start", description: "Main menu & welcome" },
        { command: "verify", description: "Start SheerID verification" },
        { command: "topup", description: "Top up credits" },
        { command: "profile", description: "View your profile" },
        { command: "checkin", description: "Daily check-in (+0.3 credits)" },
        { command: "referral", description: "Get your referral link" },
      ]);
    } catch (e) {
      console.error(`[BOT] Failed to set commands for @${username}:`, e);
    }

    registerBotHandlers(botInstance, username);
    activeBotInstances.set(dbBot.id, botInstance);

    botInstance.start({
      onStart: () => console.log(`[BOT] @${username} is running!`),
      drop_pending_updates: true,
    }).catch(async (err: any) => {
      const isConflict = err?.error_code === 409 || err?.description?.includes("terminated by other getUpdates");
      if (isConflict) {
        console.warn(`[BOT] @${username} conflict (another instance running).`);
        await storage.updateTelegramBot(dbBot.id, { status: "error" });
      } else {
        console.error(`[BOT] @${username} stopped:`, err.message || err);
        await storage.updateTelegramBot(dbBot.id, { status: "error" });
      }
      activeBotInstances.delete(dbBot.id);
    });
  } catch (err: any) {
    console.error(`[BOT] Failed to start bot ${dbBot.id} (${dbBot.label}):`, err.message || err);
    await storage.updateTelegramBot(dbBot.id, { status: "error" });
  }
}

async function stopBotInstance(dbBotId: string): Promise<void> {
  const instance = activeBotInstances.get(dbBotId);
  if (instance) {
    try {
      await instance.stop();
    } catch {}
    activeBotInstances.delete(dbBotId);
    console.log(`[BOT] Stopped bot ${dbBotId}`);
  }
  await storage.updateTelegramBot(dbBotId, { status: "stopped" });
}

export async function syncBots(): Promise<void> {
  const dbBots = await storage.getTelegramBots();

  for (const dbBot of dbBots) {
    const isRunning = activeBotInstances.has(dbBot.id);

    if (dbBot.isActive && !isRunning) {
      await launchBotInstance(dbBot);
    } else if (!dbBot.isActive && isRunning) {
      await stopBotInstance(dbBot.id);
    }
  }

  const activeIds = Array.from(activeBotInstances.keys());
  for (const id of activeIds) {
    if (!dbBots.find(b => b.id === id)) {
      await stopBotInstance(id);
    }
  }
}

const MAIN_BOT_TOKEN = "8368315033:AAEan9DQIXjlvXsTOPb6eDD4BurHcHMUOnQ";

async function seedMainBot(): Promise<void> {
  const bots = await storage.getTelegramBots();
  const exists = bots.find(b => b.token === MAIN_BOT_TOKEN);
  if (!exists) {
    console.log("[BOT] Seeding main bot into database...");
    await storage.createTelegramBot({
      token: MAIN_BOT_TOKEN,
      label: "Main Bot",
      isActive: true,
    });
    console.log("[BOT] Main bot seeded and set to active.");
  } else if (!exists.isActive) {
    console.log("[BOT] Main bot found but inactive, activating...");
    await storage.updateTelegramBot(exists.id, { isActive: true });
  }
}

export async function startBot() {
  console.log("[BOT] Initializing bot manager...");
  await seedMainBot();
  await syncBots();

  setInterval(async () => {
    try {
      await syncBots();
    } catch (e) {
      console.error("[BOT] Sync error:", e);
    }
  }, 15000);
}

export async function onBotToggled(botId: string, isActive: boolean): Promise<void> {
  if (isActive) {
    const dbBot = await storage.getTelegramBot(botId);
    if (dbBot) await launchBotInstance(dbBot);
  } else {
    await stopBotInstance(botId);
  }
}

export async function onBotDeleted(botId: string): Promise<void> {
  await stopBotInstance(botId);
}

export async function onBotAdded(botId: string): Promise<void> {
  const dbBot = await storage.getTelegramBot(botId);
  if (dbBot && dbBot.isActive) {
    await launchBotInstance(dbBot);
  }
}
