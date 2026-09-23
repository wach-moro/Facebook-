// netlify/functions/img.js
// /.netlify/functions/img/CODE pe hit hone par stored image return karta hai

import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const url = new URL(req.url);
  const code = url.pathname.split("/").pop();

  const imagesStore = getStore("images");
  const result = await imagesStore.getWithMetadata(code, { type: "arrayBuffer" });

  if (!result) {
    return new Response("Image not found", { status: 404 });
  }

  const contentType = result.metadata?.contentType || "image/jpeg";

  return new Response(result.data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
