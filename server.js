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
      const https = require('https');
      
      const options = {
        hostname: 'api.coingecko.com',
        path: '/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };
  
      const data = await new Promise((resolve, reject) => {
        https.get(options, (r) => {
          let d = '';
          r.on('data', (c) => d += c);
          r.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
      });
  
      res.json({
        bitcoin: { usd: data.bitcoin.usd, usd_24h_change: 0 },
        ethereum: { usd: data.ethereum.usd, usd_24h_change: 0 },
        solana: { usd: data.solana.usd, usd_24h_change: 0 }
      });
  
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