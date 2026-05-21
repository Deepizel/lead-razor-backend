import { env } from "../../config/env";
import type { TrackedLink } from "../../types/email";

const HREF_REGEX = /href\s*=\s*["']([^"']+)["']/gi;

function trackingBaseUrl(): string {
  return env.appUrl.replace(/\/$/, "");
}

export function openTrackingUrl(sentEmailId: string): string {
  return `${trackingBaseUrl()}/api/track/open/${sentEmailId}.png`;
}

export function clickTrackingUrl(sentEmailId: string, linkIndex: number): string {
  return `${trackingBaseUrl()}/api/track/click/${sentEmailId}/${linkIndex}`;
}

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:sans-serif;line-height:1.5;">${escaped
    .split("\n")
    .map((line) => (line.trim() ? `<p>${line}</p>` : "<br>"))
    .join("")}</div>`;
}

function extractLinksFromHtml(html: string): string[] {
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  const re = new HREF_REGEX;
  while ((match = re.exec(html)) !== null) {
    const url = match[1];
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("mailto:")
    ) {
      if (!url.includes("/api/track/click/")) {
        urls.push(url);
      }
    }
  }
  return [...new Set(urls)];
}

export function buildTrackedEmailBodies(
  sentEmailId: string,
  subject: string,
  body: string
): { html: string; text: string; links: TrackedLink[] } {
  const text = body.trim();
  let html = text.includes("<") ? text : plainTextToHtml(text);
  const rawUrls = extractLinksFromHtml(html);

  const links: TrackedLink[] = rawUrls.map((url, index) => ({
    index,
    url,
  }));

  for (const link of links) {
    const trackUrl = clickTrackingUrl(sentEmailId, link.index);
    html = html.split(link.url).join(trackUrl);
  }

  const pixel = `<img src="${openTrackingUrl(sentEmailId)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${pixel}</body>`);
  } else {
    html += pixel;
  }

  const textFooter = `\n\n---\n${subject}`;
  return { html, text: text + textFooter, links };
}

/** 1x1 transparent GIF */
export const TRACKING_PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);
