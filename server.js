const express = require("express");
const cors = require("cors");
const Parser = require("rss-parser");

const app = express();
const parser = new Parser();

app.use(cors());

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
  
      // Combine all articles from feeds that succeeded
      let articles = [];
      results.forEach(result => {
        if (result.status === "fulfilled") {
          articles = articles.concat(result.value);
        }
      });
  
      // Sort by date, newest first
      articles.sort((a, b) => new Date(b.date) - new Date(a.date));
  
      console.log(`Total articles fetched: ${articles.length}`);
      res.json(articles);
  
    } catch (error) {
      console.error("RSS ERROR:", error.message);
      res.json([]);
    }
  });

app.get("/prices", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbols=[%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22]"
    );
    const data = await response.json();

    console.log("Price data:", data);

    const prices = {};
    data.forEach(item => {
      if (item.symbol === "BTCUSDT") prices.bitcoin = { usd: parseFloat(item.price), usd_24h_change: 0 };
      if (item.symbol === "ETHUSDT") prices.ethereum = { usd: parseFloat(item.price), usd_24h_change: 0 };
      if (item.symbol === "SOLUSDT") prices.solana = { usd: parseFloat(item.price), usd_24h_change: 0 };
    });

    res.json(prices);
  } catch (error) {
    console.error("Price error:", error.message);
    res.json({});
  }
});

app.get("/sentiment", (req, res) => {
  const headline = req.query.headline?.toLowerCase() || "";

  const bullishWords = [
    "surge", "surges", "soar", "soars", "rally", "rallies", "jump", "jumps",
    "gain", "gains", "rise", "rises", "high", "highs", "bull", "bullish",
    "up", "growth", "growing", "approve", "approved", "launch", "launches",
    "adopt", "adoption", "buy", "buying", "inflow", "inflows", "record",
    "breakthrough", "partnership", "expand", "expansion", "boost", "boosts",
    "recover", "recovery", "positive", "profit", "profits", "win", "wins"
  ];

  const bearishWords = [
    "crash", "crashes", "drop", "drops", "fall", "falls", "plunge", "plunges",
    "decline", "declines", "low", "lows", "bear", "bearish", "down", "dump",
    "dumps", "sell", "selling", "outflow", "outflows", "ban", "bans", "banned",
    "hack", "hacked", "scam", "fraud", "lawsuit", "sue", "sued", "arrest",
    "arrested", "fear", "panic", "risk", "warning", "collapse", "collapses",
    "lose", "loss", "losses", "negative", "reject", "rejected", "fail", "fails"
  ];

  const bullishScore = bullishWords.filter(w => headline.includes(w)).length;
  const bearishScore = bearishWords.filter(w => headline.includes(w)).length;

  let sentiment = "Neutral";
  if (bullishScore > bearishScore) sentiment = "Bullish";
  else if (bearishScore > bullishScore) sentiment = "Bearish";

  console.log(`Sentiment: "${headline.slice(0, 50)}..." → ${sentiment}`);
  res.json({ sentiment });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});