import nodemailer from "nodemailer";
import { buildSocialDeepLink, type SocialPlatform } from "./socials";
import { sanitizeSafeHref } from "./security";

export const MESSAGE_CHANNELS = [
  "CARTABLE",
  "EMAIL",
  "TELEGRAM",
  "WHATSAPP",
  "EITAA",
  "BALE",
] as const;

export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

export function isTelegramBotConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export async function dispatchEmailNotification(params: {
  to: string | null | undefined;
  subject: string;
  text: string;
  studentName: string;
}): Promise<{ status: "SENT" | "FAILED" | "NOT_CONFIGURED" | "NO_EMAIL"; error?: string }> {
  const recipient = (params.to ?? "").trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { status: "NO_EMAIL" };
  }

  if (!isSmtpConfigured()) {
    return { status: "NOT_CONFIGURED" };
  }

  try {
    const port = Number(process.env.SMTP_PORT ?? "587");
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER!.trim(),
        pass: process.env.SMTP_PASS!.trim(),
      },
    });

    const from =
      process.env.SMTP_FROM?.trim() ||
      `Neeleh Academy <${process.env.SMTP_USER!.trim()}>`;

    await transporter.sendMail({
      from,
      to: recipient,
      subject: params.subject,
      text: `${params.studentName} عزیز،\n\n${params.text}\n\n— آکادمی معماری نیله`,
    });

    return { status: "SENT" };
  } catch (err) {
    return {
      status: "FAILED",
      error: err instanceof Error ? err.message.slice(0, 200) : "SMTP error",
    };
  }
}

export async function tryTelegramBotSend(params: {
  handleOrChatId: string | null | undefined;
  title: string;
  body: string;
}): Promise<{ sent: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const target = (params.handleOrChatId ?? "").trim();
  if (!token || !target) return { sent: false };
  // Telegram Bot API only accepts numeric chat_id unless channel @username
  if (!/^-?\d{5,20}$/.test(target)) {
    return { sent: false };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: target,
        text: `${params.title}\n\n${params.body}`,
      }),
    });
    if (!res.ok) {
      return { sent: false, error: `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message.slice(0, 120) : "Telegram error",
    };
  }
}

export type MessengerDispatchLink = {
  channel: SocialPlatform | "email";
  handle: string;
  href: string;
};

export function buildRecipientDispatchLinks(params: {
  student: {
    email?: string | null;
    telegram?: string | null;
    whatsapp?: string | null;
    eitaa?: string | null;
    bale?: string | null;
  };
  channels: MessageChannel[];
  title: string;
  body: string;
}): MessengerDispatchLink[] {
  const messageText = `${params.title}\n\n${params.body}`;
  const links: MessengerDispatchLink[] = [];

  if (params.channels.includes("EMAIL") && params.student.email?.trim()) {
    const href = sanitizeSafeHref(
      `mailto:${params.student.email.trim()}?subject=${encodeURIComponent(params.title)}&body=${encodeURIComponent(params.body)}`,
    );
    if (href) {
      links.push({ channel: "email", handle: params.student.email.trim(), href });
    }
  }

  const messengerMap: Array<{ ch: MessageChannel; platform: SocialPlatform; val?: string | null }> = [
    { ch: "TELEGRAM", platform: "telegram", val: params.student.telegram },
    { ch: "WHATSAPP", platform: "whatsapp", val: params.student.whatsapp },
    { ch: "EITAA", platform: "eitaa", val: params.student.eitaa },
    { ch: "BALE", platform: "bale", val: params.student.bale },
  ];

  for (const item of messengerMap) {
    if (params.channels.includes(item.ch) && item.val?.trim()) {
      const href = buildSocialDeepLink(item.platform, item.val.trim(), messageText);
      if (href) {
        links.push({
          channel: item.platform,
          handle: item.val.trim(),
          href,
        });
      }
    }
  }

  return links;
}
