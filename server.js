const express = require("express");
const cors = require("cors");
const Parser = require("rss-parser");
const https = require("https");

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const feeds = [
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
  { url: "https://decrypt.co/feed", source: "Decrypt" },
  { url: "https://cryptobriefing.com/feed/", source: "Crypto Briefing" }
];

// Health check (important for Railway + debugging)
app.get("/", (req, res) => {
  res.json({
    status: "AlphaFeed API running",
    endpoints: ["/news", "/prices", "/sentiment"]
  });
});

// NEWS API
app.get("/news", async (req, res) => {
  try {
    const results = await Promise.allSettled(
      feeds.map(feed =>
        parser.parseURL(feed.url).then(parsed =>
          parsed.items.slice(0, 15).map(item => ({
            title: item.title,
            url: item.link,
            image: item.enclosure?.url || "",
            source: feed.source,
            date: item.pubDate || ""
          }))
        )
      )
    );

    let articles = [];

    results.forEach(result => {
      if (result.status === "fulfilled") {
        articles = articles.concat(result.value);
      }
    });

    articles.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`Fetched ${articles.length} articles`);
    res.json(articles);

  } catch (error) {
    console.error("RSS ERROR:", error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// PRICE API
app.get("/prices", async (req, res) => {
  try {
    const options = {
      hostname: "api.coingecko.com",
      path: "/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
      headers: {
        "User-Agent": "AlphaFeed"
      }
    };

    const data = await new Promise((resolve, reject) => {
      https
        .get(options, (r) => {
          let d = "";
          r.on("data", (c) => (d += c));
          r.on("end", () => resolve(JSON.parse(d)));
        })
        .on("error", reject);
    });

    res.json(data);

  } catch (error) {
    console.error("Price error:", error.message);
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

// SENTIMENT API
app.get("/sentiment", (req, res) => {
  const headline = req.query.headline?.toLowerCase() || "";

  const bullishWords = [
    "surge","soar","rally","jump","gain","rise","high","bull","bullish",
    "growth","approve","launch","adoption","buy","inflow","record",
    "partnership","expand","boost","recover","positive","profit"
  ];

  const bearishWords = [
    "crash","drop","fall","plunge","decline","low","bear","bearish",
    "dump","sell","outflow","ban","hack","scam","fraud","lawsuit",
    "panic","risk","collapse","loss","negative","rejected"
  ];

  const bullishScore = bullishWords.filter(w => headline.includes(w)).length;
  const bearishScore = bearishWords.filter(w => headline.includes(w)).length;

  let sentiment = "Neutral";
  if (bullishScore > bearishScore) sentiment = "Bullish";
  else if (bearishScore > bullishScore) sentiment = "Bearish";

  res.json({ sentiment });
});

app.listen(PORT, () => {
  console.log(`AlphaFeed API running on port ${PORT}`);
});