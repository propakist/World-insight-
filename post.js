// ============================================================
// World Insight — single article logic
// ============================================================

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function paragraphs(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escapeHTML(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function timeAgo(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function readMins(text) {
  const words = (text || "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

async function loadPost() {
  const slug = new URLSearchParams(location.search).get("slug");
  const root = document.getElementById("post-root");

  if (!slug) {
    root.innerHTML = `<div class="state-msg">Article not found.</div>`;
    return;
  }

  const { data: post, error } = await supabaseClient
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !post) {
    root.innerHTML = `<div class="state-msg">This article doesn't exist or isn't published.</div>`;
    return;
  }

  document.title = `${post.title} | World Insight`;
  const desc = (post.excerpt || post.content || "").slice(0, 155);
  document.querySelector('meta[name="description"]').setAttribute("content", desc);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", post.title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", desc);
  const ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg && post.cover_image_url) ogImg.setAttribute("content", post.cover_image_url);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", `${location.origin}/post.html?slug=${encodeURIComponent(post.slug)}`);

  root.innerHTML = `
    <div class="post-head wrap">
      <span class="cat">${escapeHTML(post.category || "World")}</span>
      <h1>${escapeHTML(post.title)}</h1>
      <div class="meta">By World Insight Staff · ${timeAgo(post.created_at)} · ${readMins(post.content)} min read</div>
    </div>
    <div class="wrap">
      <div class="layout" style="grid-template-columns:1fr 320px;">
        <div>
          ${post.cover_image_url ? `<div class="post-cover"><img src="${post.cover_image_url}" alt="${escapeHTML(post.title)}"></div>` : ""}
          <div class="post-body">${paragraphs(post.content)}</div>
          <div class="share-bar">
            <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(post.title + " " + location.href)}" target="_blank" rel="noopener">Share on WhatsApp</a>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(location.href)}" target="_blank" rel="noopener">Share on X</a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}" target="_blank" rel="noopener">Share on Facebook</a>
          </div>
        </div>
        <aside id="sidebar-slot"></aside>
      </div>
    </div>
  `;

  loadSidebar(post.slug);
  loadRelated(post.category, post.slug);
}

async function loadSidebar(currentSlug) {
  const { data } = await supabaseClient
    .from("posts")
    .select("title, slug, created_at")
    .eq("published", true)
    .neq("slug", currentSlug)
    .order("created_at", { ascending: false })
    .limit(5);

  const slot = document.getElementById("sidebar-slot");
  if (!slot) return;
  slot.innerHTML = `
    <div class="widget">
      <div class="section-title">Latest</div>
      ${(data || []).map((p, i) => `
        <div class="pop-item">
          <span class="num">${String(i + 1).padStart(2, "0")}</span>
          <div>
            <h4><a href="post.html?slug=${encodeURIComponent(p.slug)}">${escapeHTML(p.title)}</a></h4>
            <div class="meta">${timeAgo(p.created_at)}</div>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="widget newsletter">
      <h4>Stay Informed</h4>
      <p>Original analysis on world affairs, delivered occasionally — no spam.</p>
      <form id="post-newsletter-form">
        <input type="email" placeholder="you@example.com" required>
        <button type="submit">Join</button>
      </form>
    </div>
  `;
  const f = document.getElementById("post-newsletter-form");
  if (f) f.addEventListener("submit", (e) => { e.preventDefault(); alert("Thanks — you're on the list."); f.reset(); });
}

async function loadRelated(category, currentSlug) {
  if (!category) return;
  const { data } = await supabaseClient
    .from("posts")
    .select("title, slug, cover_image_url, created_at")
    .eq("published", true)
    .eq("category", category)
    .neq("slug", currentSlug)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!data || data.length === 0) return;
  const body = document.querySelector(".post-body");
  const related = document.createElement("div");
  related.style.marginTop = "40px";
  related.innerHTML = `
    <div class="section-title">Related Coverage</div>
    <div class="post-grid" style="grid-template-columns:1fr 1fr 1fr;gap:20px;">
      ${data.map(p => `
        <article class="card">
          ${p.cover_image_url ? `<a href="post.html?slug=${encodeURIComponent(p.slug)}"><img src="${p.cover_image_url}" alt="${escapeHTML(p.title)}" loading="lazy"></a>` : ""}
          <h3 style="font-size:15px"><a href="post.html?slug=${encodeURIComponent(p.slug)}">${escapeHTML(p.title)}</a></h3>
        </article>
      `).join("")}
    </div>
  `;
  body.after(related);
}

document.addEventListener("DOMContentLoaded", loadPost);
