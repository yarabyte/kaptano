import { createMailTransport, getMailFrom } from "./client";

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMail(input: SendMailInput): Promise<void> {
  const transport = createMailTransport();

  await transport.sendMail({
    from: getMailFrom(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
