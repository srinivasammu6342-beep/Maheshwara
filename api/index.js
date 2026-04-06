"use strict";

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

// 1. మొదట app ని క్రియేట్ చేయాలి (ఇది చాలా ముఖ్యం)
const app = express();

// 2. ఆ తర్వాతే CORS సెట్టింగ్స్ ఇవ్వాలి
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const PORT = Number(process.env.PORT) || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const jsonLimit = process.env.BODY_JSON_LIMIT || "50mb";
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

// --- సహాయక ఫంక్షన్లు (Helper Functions) ---

function parseGallery(input) {
  if (Array.isArray(input)) return input.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof input === "string" && input.trim()) {
    return input.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function isValidNewsId(id) {
  if (id == null) return false;
  const s = String(id).trim();
  if (!s) return false;
  if (/^\d+$/.test(s)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function normalizeNewsId(id) { return String(id == null ? "" : id).trim(); }

function adminOk(body) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return true;
  return body && body.adminPassword === pw;
}

function escapeHtmlAttr(s) { return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/\n/g, " "); }
function escapeTitleText(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function istDateKey() { return new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 10); }

function parseGalleryRow(g) {
  if (g == null) return [];
  if (Array.isArray(g)) return g.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof g === "string") {
    try {
      const p = JSON.parse(g);
      return Array.isArray(p) ? p.map(String).map((x) => x.trim()).filter(Boolean) : [];
    } catch { return []; }
  }
  return [];
}

function isMissingColumnOrSchemaError(err) {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  return (code === "42703" || msg.includes("column") && msg.includes("does not exist"));
}

function firstNewsImage(row) {
  const hero = row && row.image_url != null ? String(row.image_url).trim() : "";
  if (hero) return hero;
  const g = parseGalleryRow(row && row.gallery_json);
  return g[0] || "";
}

function absPublicUrl(req, url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const base = (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const hostBase = base || `${req.protocol}://${req.get("host")}`;
  return hostBase + (s.startsWith("/") ? s : "/" + s);
}

function absoluteNewsDetailUrl(req, id) {
  const pathAndQuery = `/news-detail.html?id=${encodeURIComponent(id)}`;
  const pub = (process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (pub) return `${pub}${pathAndQuery}`;
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] || req.get("host") || "localhost").split(",")[0].trim();
  return `${proto}://${host}${pathAndQuery}`;
}

// --- API ROUTES ---

app.get("/api/news/ticker", async (req, res) => {
  try {
    let { data, error } = await supabase.from("news").select("id,title,created_at").order("created_at", { ascending: false }).limit(5);
    if (error) throw error;
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message, items: [] });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const lim = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const full = "id,title,content,sub_headline,category,author_name,location,image_url,gallery_json,video_url,created_at";
    let { data, error } = await supabase.from("news").select(full).order("created_at", { ascending: false }).limit(lim);
    if (error) throw error;
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/news/:id", async (req, res) => {
  try {
    const id = normalizeNewsId(req.params.id);
    if (!isValidNewsId(id)) return res.status(400).json({ ok: false, error: "invalid_id" });
    const columns = "id,title,content,sub_headline,category,author_name,location,video_url,image_url,gallery_json,created_at";
    let { data, error } = await supabase.from("news").select(columns).eq("id", id).maybeSingle();
    if (error) throw error;
    return res.json({ ok: true, item: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/save-news", async (req, res) => {
  try {
    const { title, content, sub_headline, category, author_name, location, video_url, image_url, gallery_json } = req.body;
    if (!title || !content) return res.status(400).json({ ok: false, error: "Required fields missing" });
    const { data, error } = await supabase.from("news").insert([{ title, content, sub_headline, category, author_name, location, video_url, image_url, gallery_json }]).select("id").single();
    if (error) throw error;
    return res.status(201).json({ ok: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/flash-news/ticker", async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let { data, error } = await supabase.from("flash_news").select("id,message,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(5);
    if (error) throw error;
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message, items: [] });
  }
});

app.get("/api/ads", async (req, res) => {
  try {
    let { data, error } = await supabase.from("ads").select("*").eq("active", true).order("created_at", { ascending: false }).limit(25);
    if (error) throw error;
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/stats/public", async (req, res) => {
  try {
    let { data, error } = await supabase.from("visitor_stats").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return res.json({ ok: true, total: data?.total_visits || 0, today: data?.day_visits || 0 });
  } catch (e) {
    return res.json({ ok: true, total: 0, today: 0 });
  }
});

app.post("/api/stats/ping", async (req, res) => {
  try {
    const todayKey = istDateKey();
    let { data: row } = await supabase.from("visitor_stats").select("*").eq("id", 1).maybeSingle();
    if (!row) {
      await supabase.from("visitor_stats").insert({ id: 1, total_visits: 1, day_key: todayKey, day_visits: 1 });
    } else {
      const nextTotal = (row.total_visits || 0) + 1;
      const nextDay = (row.day_key === todayKey) ? (row.day_visits || 0) + 1 : 1;
      await supabase.from("visitor_stats").update({ total_visits: nextTotal, day_key: todayKey, day_visits: nextDay }).eq("id", 1);
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.json({ ok: true });
  }
});

// --- DYNAMIC OG TAGS (For WhatsApp Previews) ---

app.get("/news-detail.html", async (req, res, next) => {
  try {
    const id = normalizeNewsId(req.query.id);
    if (!isValidNewsId(id)) return next();
    let { data, error } = await supabase.from("news").select("*").eq("id", id).maybeSingle();
    if (error || !data) return next();

    const filePath = path.join(__dirname, "..", "news-detail.html");
    let html = fs.readFileSync(filePath, "utf8");

    const desc = (data.sub_headline || data.content || "").slice(0, 200);
    const img = firstNewsImage(data);
    const ogBlock = `
      <meta name="description" content="${escapeHtmlAttr(desc)}" />
      <meta property="og:title" content="${escapeHtmlAttr(data.title)}" />
      <meta property="og:description" content="${escapeHtmlAttr(desc)}" />
      <meta property="og:image" content="${escapeHtmlAttr(img)}" />
    `;
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${data.title}</title>`);
    html = html.replace(/<meta charset="UTF-8"\s*\/?>/i, `<meta charset="UTF-8" />\n${ogBlock}`);
    res.type("html").send(html);
  } catch (e) { next(); }
});

app.use(express.static(path.join(__dirname, "..")));

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
}

module.exports = app;