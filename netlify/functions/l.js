// netlify/functions/l.js
// /l/CODE pe hit hone par:
// - Agar Facebook/social crawler hai -> OG tags wala HTML page dikhao (image + description)
// - Agar real user hai -> 2 second delay ke baad target URL pe redirect kar do

import { getStore } from "@netlify/blobs";

const CRAWLER_PATTERNS = [
  "facebookexternalhit",
  "facebookcatalog",
  "facebook",
  "Facebot",
  "WhatsApp",
  "Twitterbot",
  "LinkedInBot",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
  "Pinterest",
  "SkypeUriPreview",
  "vkShare",
  "redditbot",
];

function isCrawler(userAgent = "") {
  return CRAWLER_PATTERNS.some((pattern) =>
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async (req, context) => {
  const url = new URL(req.url);
  const code = url.pathname.split("/").pop();
  const userAgent = req.headers.get("user-agent") || "";

  const linksStore = getStore("links");
  const linkDataRaw = await linksStore.get(code);

  if (!linkDataRaw) {
    return new Response("Link not found", { status: 404 });
  }

  const linkData = JSON.parse(linkDataRaw);
  const siteUrl = process.env.URL || `https://${req.headers.get("host")}`;
  const imageUrl = `${siteUrl}/img/${code}`;

  linkData.clicks = (linkData.clicks || 0) + 1;
  linksStore.set(code, JSON.stringify(linkData));

  const title = escapeHtml(linkData.title || "Check this out");
  const description = escapeHtml(linkData.description || "");
  const redirectUrl = linkData.redirectUrl;

  const crawler = isCrawler(userAgent);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${siteUrl}/l/${code}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <title>${title}</title>
  ${
    crawler
      ? ""
      : `<script>setTimeout(function(){ window.location.replace(${JSON.stringify(
          redirectUrl
        )}); }, 2000);</script>`
  }
</head>
<body>
  <p>Redirecting...</p>
  ${crawler ? "" : `<p>Agar redirect na ho to <a href="${escapeHtml(redirectUrl)}">yahan click karein</a>.</p>`}
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
