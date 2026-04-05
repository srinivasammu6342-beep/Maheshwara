"use strict";

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const PORT = Number(process.env.PORT) || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

const jsonLimit = process.env.BODY_JSON_LIMIT || "50mb";
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

function parseGallery(input) {
  if (Array.isArray(input)) {
    return input.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof input === "string" && input.trim()) {
    return input
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Accepts standard 8-4-4-4-12 UUIDs (any version/variant) and numeric string ids. */
function isValidNewsId(id) {
  if (id == null) return false;
  const s = String(id).trim();
  if (!s) return false;
  if (/^\d+$/.test(s)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function normalizeNewsId(id) {
  return String(id == null ? "" : id).trim();
}

function adminOk(body) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return true;
  return body && body.adminPassword === pw;
}

function escapeHtmlAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/\n/g, " ");
}

function escapeTitleText(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function istDateKey() {
  return new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 10);
}

function parseGalleryRow(g) {
  if (g == null) return [];
  if (Array.isArray(g)) return g.map(String).map((x) => x.trim()).filter(Boolean);
  if (typeof g === "string") {
    try {
      const p = JSON.parse(g);
      return Array.isArray(p) ? p.map(String).map((x) => x.trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Postgres / PostgREST: unknown column or schema cache mismatch — retry with fewer columns */
function isMissingColumnOrSchemaError(err) {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  const details = String(err.details || "").toLowerCase();
  if (code === "42703") return true;
  if (msg.includes("column") && (msg.includes("does not exist") || msg.includes("unknown"))) return true;
  if (msg.includes("could not find") && msg.includes("column")) return true;
  if (details.includes("column") && details.includes("not find")) return true;
  return false;
}

/** Hero image for OG / previews: primary `image_url` first, then first gallery entry. */
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

/** Canonical / og:url: prefer PUBLIC_SITE_URL (live site) so WhatsApp previews use the deployed link, not the crawler’s transient host. */
function absoluteNewsDetailUrl(req, id) {
  const pathAndQuery = `/news-detail.html?id=${encodeURIComponent(id)}`;
  const pub = (process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (pub) {
    return `${pub}${pathAndQuery}`;
  }
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] || req.get("host") || "localhost").split(",")[0].trim();
  return `${proto}://${host}${pathAndQuery}`;
}

/** Last 5 headlines (fallback if flash_news empty) */
app.get("/api/news/ticker", async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("news")
      .select("id,title,created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase.from("news").select("id,title").order("id", { ascending: false }).limit(5));
    }

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: error.message, items: [] });
    }
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error", items: [] });
  }
});

/** Related: same category first, then fill with latest */
app.get("/api/news/related", async (req, res) => {
  try {
    const exclude = typeof req.query.exclude === "string" ? req.query.exclude : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 4));

    if (!isValidNewsId(exclude)) {
      return res.status(400).json({ ok: false, error: "exclude must be a valid story id" });
    }

    let out = [];

    if (category) {
      let { data: same, error: e1 } = await supabase
        .from("news")
        .select("id,title,created_at,category")
        .eq("category", category)
        .neq("id", exclude)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (e1 && isMissingColumnOrSchemaError(e1)) {
        ({ data: same } = await supabase
          .from("news")
          .select("id,title,category")
          .eq("category", category)
          .neq("id", exclude)
          .limit(limit * 2));
        same = (same || []).slice(0, limit);
      }

      out = same || [];
    }

    if (out.length < limit) {
      let { data: rest, error: e2 } = await supabase
        .from("news")
        .select("id,title,created_at,category")
        .neq("id", exclude)
        .order("created_at", { ascending: false })
        .limit(limit * 2);

      if (e2 && isMissingColumnOrSchemaError(e2)) {
        ({ data: rest } = await supabase.from("news").select("id,title,category").neq("id", exclude).limit(limit * 3));
      }

      const seen = new Set(out.map((r) => r.id));
      for (const row of rest || []) {
        if (out.length >= limit) break;
        if (!seen.has(row.id)) {
          seen.add(row.id);
          out.push(row);
        }
      }
    }

    return res.json({ ok: true, items: out.slice(0, limit) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error", items: [] });
  }
});

/** List news (summary) */
app.get("/api/news", async (req, res) => {
  try {
    const lim = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const full =
      "id,title,content,sub_headline,category,author_name,location,image_url,gallery_json,video_url,created_at";
    let { data, error } = await supabase.from("news").select(full).order("created_at", { ascending: false }).limit(lim);

    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase
        .from("news")
        .select("id,title,content,image_url")
        .order("id", { ascending: false })
        .limit(lim));
    }

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/** Single article — columns aligned with Supabase `news` table */
app.get("/api/news/:id", async (req, res) => {
  try {
    const id = normalizeNewsId(req.params.id);
    if (!isValidNewsId(id)) {
      return res.status(400).json({
        ok: false,
        error: "invalid_id",
        message: "The link is missing a valid story id. Open the article from the news list.",
      });
    }

    const columns =
      "id,title,content,sub_headline,category,author_name,location,video_url,image_url,gallery_json,created_at";

    let { data, error } = await supabase.from("news").select(columns).eq("id", id).maybeSingle();

    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase.from("news").select("id,title,content,image_url").eq("id", id).maybeSingle());
    }

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: error.code || "db_error", message: error.message });
    }
    if (!data) {
      return res.status(404).json({
        ok: false,
        error: "not_found",
        message: "This story could not be found. It may have been removed.",
      });
    }
    return res.json({ ok: true, item: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "server_error", message: "Server error" });
  }
});

app.post("/api/save-news", async (req, res) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    const sub_headline =
      typeof req.body.sub_headline === "string" && req.body.sub_headline.trim()
        ? req.body.sub_headline.trim()
        : null;
    const category =
      typeof req.body.category === "string" && req.body.category.trim()
        ? req.body.category.trim()
        : "General";
    const author_name =
      typeof req.body.author_name === "string" && req.body.author_name.trim()
        ? req.body.author_name.trim()
        : null;
    const location =
      typeof req.body.location === "string" && req.body.location.trim()
        ? req.body.location.trim()
        : null;
    const video_url =
      typeof req.body.video_url === "string" && req.body.video_url.trim()
        ? req.body.video_url.trim()
        : null;
    const image_url =
      typeof req.body.image_url === "string" && req.body.image_url.trim()
        ? req.body.image_url.trim()
        : null;

    let gallery = [];
    if (Array.isArray(req.body.gallery_json)) {
      gallery = parseGallery(req.body.gallery_json);
    }
    gallery = gallery.concat(parseGallery(req.body.gallery_urls_text));

    if (!title || !content) {
      return res.status(400).json({ ok: false, error: "title and content are required" });
    }

    const row = {
      title,
      content,
      sub_headline,
      category,
      author_name,
      location,
      video_url,
      image_url,
      gallery_json: gallery,
    };

    const { data, error } = await supabase.from("news").insert(row).select("id").single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, id: data.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/** Flash news — last 24h, latest 5 for ticker */
app.get("/api/flash-news/ticker", async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let { data, error } = await supabase
      .from("flash_news")
      .select("id,message,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase.from("flash_news").select("id,message").order("id", { ascending: false }).limit(5));
    }

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: error.message, items: [] });
    }
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error", items: [] });
  }
});

app.post("/api/save-flash-news", async (req, res) => {
  try {
    if (!adminOk(req.body)) {
      return res.status(403).json({ ok: false, error: "Unauthorized — set ADMIN_PASSWORD in .env to match admin panel password." });
    }
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      return res.status(400).json({ ok: false, error: "message is required" });
    }
    const { data, error } = await supabase.from("flash_news").insert({ message }).select("id").single();
    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(201).json({ ok: true, id: data.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/** Ads visible in UI: active = true or unset (null) — excludes explicit active = false */
function adsVisibleFilter(q) {
  return q.or("active.eq.true,active.is.null");
}

/** Public: active ads (newest first) */
app.get("/api/ads", async (req, res) => {
  try {
    let q = supabase.from("ads").select("id,image_url,link_url,sort_order,created_at,active");
    q = adsVisibleFilter(q);
    let { data, error } = await q.order("created_at", { ascending: false }).limit(25);

    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase
        .from("ads")
        .select("id,image_url,link_url,sort_order,created_at")
        .order("created_at", { ascending: false })
        .limit(25));
    }
    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase.from("ads").select("id,image_url,link_url").order("id", { ascending: false }).limit(25));
    }

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: error.message, items: [] });
    }
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error", items: [] });
  }
});

/** Single latest sidebar ad (full image_url text — base64 or URL) */
app.get("/api/ads/sidebar", async (req, res) => {
  try {
    let q = supabase.from("ads").select("id,image_url,link_url,created_at");
    q = adsVisibleFilter(q);
    let { data, error } = await q.order("created_at", { ascending: false }).limit(1);

    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase
        .from("ads")
        .select("id,image_url,link_url,created_at")
        .order("created_at", { ascending: false })
        .limit(1));
    }
    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase.from("ads").select("id,image_url,link_url").order("id", { ascending: false }).limit(1));
    }

    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: error.message, ad: null });
    }
    const row = Array.isArray(data) && data[0] ? data[0] : null;
    return res.json({ ok: true, ad: row });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error", ad: null });
  }
});

app.post("/api/save-ad", async (req, res) => {
  try {
    if (!adminOk(req.body)) {
      return res.status(403).json({ ok: false, error: "Unauthorized — set ADMIN_PASSWORD in .env to match admin panel password." });
    }
    const image_url = typeof req.body.image_url === "string" ? req.body.image_url.trim() : "";
    const link_url =
      typeof req.body.link_url === "string" && req.body.link_url.trim() ? req.body.link_url.trim() : null;
    const sort_order = Math.min(1000, Math.max(0, parseInt(req.body.sort_order, 10) || 0));
    if (!image_url) {
      return res.status(400).json({ ok: false, error: "image_url is required" });
    }
    let { data, error } = await supabase
      .from("ads")
      .insert({ image_url, link_url, active: true, sort_order })
      .select("id")
      .single();
    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase.from("ads").insert({ image_url, link_url }).select("id").single());
    }
    if (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: error.message });
    }
    return res.status(201).json({ ok: true, id: data.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

/** Visitor stats (single row id=1) */
app.get("/api/stats/public", async (req, res) => {
  try {
    let { data, error } = await supabase.from("visitor_stats").select("total_visits,day_key,day_visits").eq("id", 1).maybeSingle();
    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase.from("visitor_stats").select("total_visits").eq("id", 1).maybeSingle());
    }
    if (error) {
      console.warn("visitor_stats read:", error.message);
      return res.json({ ok: true, total: 0, today: 0 });
    }
    if (!data) return res.json({ ok: true, total: 0, today: 0 });
    const todayKey = istDateKey();
    const hasDay = Object.prototype.hasOwnProperty.call(data, "day_key") && Object.prototype.hasOwnProperty.call(data, "day_visits");
    const today = hasDay && data.day_key === todayKey ? Number(data.day_visits) || 0 : 0;
    return res.json({ ok: true, total: Number(data.total_visits) || 0, today });
  } catch (e) {
    console.error(e);
    return res.json({ ok: true, total: 0, today: 0 });
  }
});

app.post("/api/stats/ping", async (req, res) => {
  try {
    const todayKey = istDateKey();
    let sel = await supabase.from("visitor_stats").select("id,total_visits,day_key,day_visits").eq("id", 1).maybeSingle();
    if (sel.error && isMissingColumnOrSchemaError(sel.error)) {
      sel = await supabase.from("visitor_stats").select("id,total_visits").eq("id", 1).maybeSingle();
    }
    if (sel.error) {
      console.warn("visitor_stats ping select:", sel.error.message);
      return res.json({ ok: true, total: 0, today: 0 });
    }

    const row = sel.data;
    if (!row) {
      let ins = await supabase
        .from("visitor_stats")
        .insert({ id: 1, total_visits: 1, day_key: todayKey, day_visits: 1 });
      if (ins.error && isMissingColumnOrSchemaError(ins.error)) {
        ins = await supabase.from("visitor_stats").insert({ id: 1, total_visits: 1 });
      }
      if (ins.error) {
        console.warn("visitor_stats ping insert:", ins.error.message);
        return res.json({ ok: true, total: 0, today: 0 });
      }
      return res.json({ ok: true, total: 1, today: 1 });
    }

    const nextTotal = (Number(row.total_visits) || 0) + 1;
    const hasDay = Object.prototype.hasOwnProperty.call(row, "day_key") && Object.prototype.hasOwnProperty.call(row, "day_visits");
    let nextDay = 1;
    if (hasDay) {
      nextDay = Number(row.day_visits) || 0;
      if (row.day_key === todayKey) nextDay += 1;
      else nextDay = 1;
    }

    let up = await supabase
      .from("visitor_stats")
      .update({ total_visits: nextTotal, day_key: todayKey, day_visits: nextDay })
      .eq("id", 1);
    if (up.error && isMissingColumnOrSchemaError(up.error)) {
      up = await supabase.from("visitor_stats").update({ total_visits: nextTotal }).eq("id", 1);
    }
    if (up.error) {
      console.warn("visitor_stats ping update:", up.error.message);
      return res.json({ ok: true, total: nextTotal, today: hasDay ? nextDay : 0 });
    }
    return res.json({ ok: true, total: nextTotal, today: hasDay ? nextDay : 0 });
  } catch (e) {
    console.error(e);
    return res.json({ ok: true, total: 0, today: 0 });
  }
});

/**
 * Dynamic Open Graph for WhatsApp / social previews.
 * og:image uses the article's image_url (then gallery). Must be an absolute https URL on the live domain.
 * Note: WhatsApp/Telegram crawlers do not reliably fetch previews for localhost or data: URLs — test on your public site (e.g. PUBLIC_SITE_URL).
 */
app.get("/news-detail.html", async (req, res, next) => {
  try {
    const id = normalizeNewsId(req.query.id);
    if (!isValidNewsId(id)) return next();

    const columns =
      "id,title,content,sub_headline,category,author_name,location,video_url,image_url,gallery_json,created_at";
    let { data, error } = await supabase.from("news").select(columns).eq("id", id).maybeSingle();
    if (error && isMissingColumnOrSchemaError(error)) {
      ({ data, error } = await supabase.from("news").select("id,title,content,image_url").eq("id", id).maybeSingle());
    }
    if (error || !data) return next();

    const filePath = path.join(__dirname, "news-detail.html");
    let html;
    try {
      html = fs.readFileSync(filePath, "utf8");
    } catch (e) {
      return next();
    }

    const siteName = "Maheshwara Nexlify Nucleus";
    const title = `${data.title || "News"} — ${siteName}`;
    const rawDesc =
      (data.sub_headline && String(data.sub_headline).trim()) ||
      String(data.content || "")
        .replace(/\s+/g, " ")
        .trim();
    const desc = rawDesc.slice(0, 220) + (rawDesc.length > 220 ? "…" : "");
    const imgRaw = firstNewsImage(data);
    const canonical = absoluteNewsDetailUrl(req, id);
    const ogImage =
      imgRaw && !String(imgRaw).trim().toLowerCase().startsWith("data:")
        ? absPublicUrl(req, imgRaw)
        : "";

    const ogBlock = [
      `<meta name="description" content="${escapeHtmlAttr(desc)}" />`,
      `<meta property="og:site_name" content="${escapeHtmlAttr(siteName)}" />`,
      `<meta property="og:title" content="${escapeHtmlAttr(data.title || siteName)}" />`,
      `<meta property="og:description" content="${escapeHtmlAttr(desc)}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:url" content="${escapeHtmlAttr(canonical)}" />`,
      ogImage ? `<meta property="og:image" content="${escapeHtmlAttr(ogImage)}" />` : "",
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeHtmlAttr(data.title || siteName)}" />`,
      `<meta name="twitter:description" content="${escapeHtmlAttr(desc)}" />`,
      ogImage ? `<meta name="twitter:image" content="${escapeHtmlAttr(ogImage)}" />` : "",
      `<link rel="canonical" href="${escapeHtmlAttr(canonical)}" />`,
    ]
      .filter(Boolean)
      .join("\n  ");

    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeTitleText(title)}</title>`);
    html = html.replace(/<meta charset="UTF-8"\s*\/?>/i, `<meta charset="UTF-8" />\n  ${ogBlock}`);

    res.type("html").send(html);
  } catch (e) {
    console.error(e);
    next();
  }
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`Maheshwara Nexlify Nucleus server at http://localhost:${PORT}`);
  console.log(`JSON body limit: ${jsonLimit}`);
});
