export interface SendOutreachInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface SendOutreachResult {
  messageId: string;
}

export interface OutreachEmailProvider {
  readonly name: "gmail" | "resend";
  send(input: SendOutreachInput): Promise<SendOutreachResult>;
}
