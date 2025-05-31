const axios = require("axios");

module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url || !url.includes("instagram.com")) {
    return res.status(400).json({ error: "Missing or invalid Instagram URL" });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/117.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    const html = response.data;

    // Try to find video_url directly in the HTML string
    const match = html.match(/"video_url":"([^"]+)"/);

    if (match && match[1]) {
      const videoUrl = match[1].replace(/\\u0026/g, "&");
      return res.status(200).json({ mp4: videoUrl });
    } else {
      return res.status(404).json({ error: "Video URL not found in HTML" });
    }
  } catch (err) {
    console.error("Error fetching Instagram page:", err.message);
    return res.status(500).json({ error: "Failed to fetch or parse page" });
  }
};
