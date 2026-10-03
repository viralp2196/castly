import nodemailer from "nodemailer";
import type { Logger } from "pino";
import type { Config } from "./config";

export type Mail = { to: string; subject: string; text: string };

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Sends through SMTP when configured; otherwise logs the email so local password resets still work. */
export function createMailer(config: Config, logger: Logger): Mailer {
  if (!config.smtpUrl) {
    return {
      async send(mail) {
        logger.info({ to: mail.to, subject: mail.subject }, `email (not sent, no SMTP_URL):\n${mail.text}`);
      },
    };
  }
  const transport = nodemailer.createTransport(config.smtpUrl);
  return {
    async send(mail) {
      await transport.sendMail({ from: config.mailFrom, to: mail.to, subject: mail.subject, text: mail.text });
    },
  };
}
