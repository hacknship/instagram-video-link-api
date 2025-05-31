// api/fetch.js

const axios = require("axios");
const cheerio = require("cheerio");

module.exports = async function handler(req, res) {
  const { url } = req.query;

  // Basic validation: must be an Instagram URL
  if (!url || !url.includes("instagram.com")) {
    return res.status(400).json({ error: "Missing or invalid Instagram URL" });
  }

  try {
    // Fetch the HTML of the Instagram post
    const { data: html } = await axios.get(url, {
      headers: {
        // Instagram often blocks non-browser User-Agents, so we send a common UA
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "text/html",
      },
    });

    // Load the HTML into Cheerio so we can search for the JSON blob
    const $ = cheerio.load(html);
    let videoUrl = null;

    // Instagram places post data in a <script> that contains "window.__additionalDataLoaded"
    // (or in newer cases __NEXT_DATA__ / window._sharedData). We look for whichever exists.
    $("script").each((i, el) => {
      const text = $(el).html();
      // First try pattern: window._sharedData  (older versions)
      if (text && text.includes("window._sharedData")) {
        try {
          // Example: window._sharedData = { … };   ← strip off the JS wrapper to parse JSON
          const jsonText = text
            .replace("window._sharedData = ", "")
            .replace(/;$/, "");
          const data = JSON.parse(jsonText);
          // Drill into the JSON structure:
          const media = data.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
          if (media && media.video_url) {
            videoUrl = media.video_url;
          }
        } catch (e) {
          // ignore JSON parse errors here
        }
      }

      // If not found yet, try the newer structure (sometimes called "__additionalDataLoaded")
      if (!videoUrl && text && text.includes("window.__additionalDataLoaded")) {
        try {
          // Example: window.__additionalDataLoaded('/p/ABCDE/', { "graphql": { … } })
          const match = text.match(/\{.*\}/s);
          if (match) {
            const data = JSON.parse(match[0]);
            const media = data.graphql?.shortcode_media;
            if (media && media.video_url) {
              videoUrl = media.video_url;
            }
          }
        } catch (e) {
          // ignore JSON parse errors here
        }
      }
    });

    if (!videoUrl) {
      return res.status(404).json({ error: "Video URL not found in post" });
    }

    // Return the raw MP4 link
    return res.status(200).json({ mp4: videoUrl });
  } catch (err) {
    console.error("fetch error:", err.message);
    return res.status(500).json({ error: "Failed to fetch or parse Instagram page" });
  }
};
