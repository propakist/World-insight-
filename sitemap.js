// Dynamic sitemap: lists every published article plus the static pages.
// Uses the PUBLISHABLE key + Supabase REST API — safe to run server-side or client-side.
const SUPABASE_URL = "https://stkqngzoxjjpjqzcbrga.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QJU7W5i8q5ax3hM8JXt9Rw_g7f7nhuk";
const SITE_URL = "https://world-insight.netlify.app";

exports.handler = async function () {
  const staticPages = [
    { loc: "/", freq: "daily", pri: "1.0" },
    { loc: "/about.html", freq: "monthly", pri: "0.5" },
    { loc: "/contact.html", freq: "monthly", pri: "0.5" },
    { loc: "/privacy-policy.html", freq: "yearly", pri: "0.3" },
    { loc: "/disclaimer.html", freq: "yearly", pri: "0.3" },
    { loc: "/terms.html", freq: "yearly", pri: "0.3" },
    { loc: "/dmca.html", freq: "yearly", pri: "0.3" },
  ];

  let posts = [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?select=slug,created_at&published=eq.true&order=created_at.desc`,
      { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` } }
    );
    posts = await res.json();
    if (!Array.isArray(posts)) posts = [];
  } catch (e) {
    posts = [];
  }

  const staticXml = staticPages
    .map(p => `  <url><loc>${SITE_URL}${p.loc}</loc><changefreq>${p.freq}</changefreq><priority>${p.pri}</priority></url>`)
    .join("\n");

  const postXml = posts
    .map(p => `  <url><loc>${SITE_URL}/post.html?slug=${encodeURIComponent(p.slug)}</loc><lastmod>${new Date(p.created_at).toISOString().split("T")[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticXml}\n${postXml}\n</urlset>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/xml; charset=UTF-8" },
    body,
  };
};
