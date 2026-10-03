import nodemailer from "nodemailer";
import type { Logger } from "pino";
import type { Config } from "./config";

export type Mail = { to: string; subject: string; text: string };

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/**
 * Sends through SMTP when configured. Without SMTP, development prints the email
 * (so local password resets work); production never logs the body, because it
 * holds single-use reset links.
 */
export function createMailer(config: Pick<Config, "env" | "smtpUrl" | "mailFrom">, logger: Logger): Mailer {
  if (!config.smtpUrl) {
    return {
      async send(mail) {
        if (config.env === "production") {
          logger.error({ subject: mail.subject }, "SMTP_URL is not set; email was not sent");
          return;
        }
        logger.info({ to: mail.to, subject: mail.subject }, `email (dev only, not sent; set SMTP_URL to deliver):\n${mail.text}`);
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
