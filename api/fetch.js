// api/fetch.js

const axios = require("axios");
const cheerio = require("cheerio");

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.includes("instagram.com")) {
    return res.status(400).json({ error: "Missing or invalid Instagram URL" });
  }

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "text/html",
      },
    });

    const $ = cheerio.load(html);
    const scripts = $("script");

    let found = null;
    scripts.each((i, el) => {
      const content = $(el).html();
      if (content.includes("window.__additionalDataLoaded")) {
        const match = content.match(/{.*}/s);
        if (match) {
          const json = JSON.parse(match[0]);
          const mp4 = json?.graphql?.shortcode_media?.video_url;
          if (mp4) found = mp4;
        }
      }
    });

    if (found) {
      return res.json({ mp4: found });
    } else {
      return res.status(404).json({ error: "Video URL not found in post" });
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Failed to fetch or parse Instagram page" });
  }
}
