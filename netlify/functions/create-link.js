// netlify/functions/create-link.js
// Naya short link banata hai: image (base64), redirect URL, aur description save karta hai
// Netlify Blob storage me, aur ek unique short code return karta hai.

import { getStore } from "@netlify/blobs";

function generateCode(length = 7) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { imageBase64, imageType, redirectUrl, description, title } = body;

    if (!imageBase64 || !redirectUrl) {
      return new Response(
        JSON.stringify({ error: "Image aur redirect URL dono zaroori hain" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Basic URL validation
    try {
      new URL(redirectUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Redirect URL sahi format me nahi hai" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const linksStore = getStore("links");
    const imagesStore = getStore("images");

    // Unique code generate karo (agar collision ho to dobara try karo)
    let code = generateCode();
    let attempts = 0;
    while ((await linksStore.get(code)) && attempts < 5) {
      code = generateCode();
      attempts++;
    }

    // Image ko blob store me save karo (base64 -> binary)
    const imageBuffer = Buffer.from(imageBase64, "base64");
    await imagesStore.set(code, imageBuffer, {
      metadata: { contentType: imageType || "image/jpeg" },
    });

    // Link metadata save karo
    const linkData = {
      code,
      redirectUrl,
      description: description || "",
      title: title || "",
      createdAt: new Date().toISOString(),
      clicks: 0,
    };
    await linksStore.set(code, JSON.stringify(linkData));

    const siteUrl = "https://link-hub.online";
    const shortLink = `${siteUrl}/l/${code}`;

    return new Response(JSON.stringify({ success: true, shortLink, code }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error: " + err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
