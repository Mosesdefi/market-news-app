const express = require("express");
const cors = require("cors");
const Parser = require("rss-parser");
const https = require("https");

const app = express();
const parser = new Parser();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "AlphaFeed API is running",
    endpoints: ["/news", "/prices", "/sentiment"]
  });
});

app.get("/news", async (req, res) => {
  try {
    const feeds = [
      { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
      { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
      { url: "https://decrypt.co/feed", source: "Decrypt" },
      { url: "https://cryptobriefing.com/feed/", source: "Crypto Briefing" }
    ];

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
      if (result.status === "fulfilled") articles = articles.concat(result.value);
    });

    articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(articles);

  } catch (error) {
    console.error("RSS ERROR:", error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.get("/prices", async (req, res) => {
  try {
    const fetchTicker = (id) => new Promise((resolve, reject) => {
      https.get({
        hostname: 'api.coinpaprika.com',
        path: `/v1/tickers/${id}`,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const [btc, eth, sol] = await Promise.all([
      fetchTicker('btc-bitcoin'),
      fetchTicker('eth-ethereum'),
      fetchTicker('sol-solana')
    ]);

    res.json({
      bitcoin: { usd: btc?.quotes?.USD?.price || 0 },
      ethereum: { usd: eth?.quotes?.USD?.price || 0 },
      solana: { usd: sol?.quotes?.USD?.price || 0 }
    });

  } catch (error) {
    console.error("Price ERROR:", error.message);
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

app.get("/sentiment", (req, res) => {
  const headline = req.query.headline?.toLowerCase() || "";

  const bullishWords = ["surge","rally","gain","rise","bullish","up","growth","buy","record","boost","recover","positive","profit"];
  const bearishWords = ["crash","drop","fall","plunge","decline","bearish","down","dump","sell","ban","hack","scam","fraud","lawsuit","fear","panic","loss","negative","fail"];

  const bullishScore = bullishWords.filter(w => headline.includes(w)).length;
  const bearishScore = bearishWords.filter(w => headline.includes(w)).length;

  let sentiment = "Neutral";
  if (bullishScore > bearishScore) sentiment = "Bullish";
  else if (bearishScore > bullishScore) sentiment = "Bearish";

  res.json({ headline, sentiment });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));