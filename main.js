// ============================================================
// World Insight — homepage / listing logic
// ============================================================

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function readMins(text) {
  const words = (text || "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function cardHTML(post) {
  const img = post.cover_image_url || "";
  return `
    <article class="card">
      ${img ? `<a href="post.html?slug=${encodeURIComponent(post.slug)}"><img src="${img}" alt="${escapeHTML(post.title)}" loading="lazy"></a>` : ""}
      <span class="cat">${escapeHTML(post.category || "World")}</span>
      <h2><a href="post.html?slug=${encodeURIComponent(post.slug)}">${escapeHTML(post.title)}</a></h2>
      <p>${escapeHTML(post.excerpt || "")}</p>
      <div class="meta">${timeAgo(post.created_at)} · ${readMins(post.content)} min read</div>
    </article>`;
}

function sideItemHTML(post) {
  const img = post.cover_image_url || "";
  return `
    <div class="hero-side-item">
      ${img ? `<a href="post.html?slug=${encodeURIComponent(post.slug)}"><img src="${img}" alt="${escapeHTML(post.title)}" loading="lazy"></a>` : "<div></div>"}
      <div>
        <h3><a href="post.html?slug=${encodeURIComponent(post.slug)}">${escapeHTML(post.title)}</a></h3>
        <div class="meta">${escapeHTML(post.category || "World")} · ${timeAgo(post.created_at)}</div>
      </div>
    </div>`;
}

function popItemHTML(post, i) {
  return `
    <div class="pop-item">
      <span class="num">${String(i + 1).padStart(2, "0")}</span>
      <div>
        <h4><a href="post.html?slug=${encodeURIComponent(post.slug)}">${escapeHTML(post.title)}</a></h4>
        <div class="meta">${timeAgo(post.created_at)}</div>
      </div>
    </div>`;
}

let allPosts = [];
let visibleCount = 6;

async function loadPosts() {
  const params = new URLSearchParams(location.search);
  const category = params.get("category");
  const search = params.get("q");

  let query = supabaseClient
    .from("posts")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    document.getElementById("post-grid").innerHTML = `<div class="state-msg">Could not load articles right now.</div>`;
    return;
  }

  allPosts = data || [];
  document.getElementById("feed-title").textContent = category
    ? category
    : (search ? `Results for "${search}"` : "Latest Stories");

  if (allPosts.length === 0) {
    document.getElementById("post-grid").innerHTML = `<div class="state-msg">No articles published yet. Check back soon.</div>`;
    document.getElementById("hero-section").style.display = "none";
    document.getElementById("popular-widget").style.display = "none";
    document.getElementById("load-more-wrap").style.display = "none";
    return;
  }

  // Hero (only on the unfiltered homepage)
  const heroSection = document.getElementById("hero-section");
  if (heroSection && !category && !search) {
    const [feature, ...rest] = allPosts;
    document.getElementById("hero-feature").innerHTML = `
      <span class="eyebrow">Top Story</span>
      ${feature.cover_image_url ? `<a href="post.html?slug=${encodeURIComponent(feature.slug)}"><img src="${feature.cover_image_url}" alt="${escapeHTML(feature.title)}"></a>` : ""}
      <h1><a href="post.html?slug=${encodeURIComponent(feature.slug)}">${escapeHTML(feature.title)}</a></h1>
      <p class="dek">${escapeHTML(feature.excerpt || "")}</p>
      <div class="meta" style="font-family:var(--mono);font-size:12px;color:var(--text-mute)">${timeAgo(feature.created_at)} · ${readMins(feature.content)} min read</div>
    `;
    document.getElementById("hero-side").innerHTML = rest.slice(0, 4).map(sideItemHTML).join("");
  } else if (heroSection) {
    heroSection.style.display = "none";
  }

  // Popular sidebar — most recent 5 as a stand-in for "most read"
  const popWrap = document.getElementById("popular-list");
  if (popWrap) {
    popWrap.innerHTML = allPosts.slice(0, 5).map(popItemHTML).join("");
  }

  // Category tag cloud
  const tagWrap = document.getElementById("tag-list");
  if (tagWrap) {
    const cats = [...new Set(allPosts.map(p => p.category).filter(Boolean))];
    tagWrap.innerHTML = cats.map(c => `<a href="index.html?category=${encodeURIComponent(c)}">${escapeHTML(c)}</a>`).join("");
  }

  renderGrid();
}

function renderGrid() {
  const params = new URLSearchParams(location.search);
  const category = params.get("category");
  const search = params.get("q");
  const skipFirst = (!category && !search) ? 5 : 0; // first 5 already used in hero
  const list = allPosts.slice(skipFirst);

  const grid = document.getElementById("post-grid");
  grid.innerHTML = list.slice(0, visibleCount).join
    ? ""
    : "";
  grid.innerHTML = list.slice(0, visibleCount).map(cardHTML).join("");

  const moreWrap = document.getElementById("load-more-wrap");
  if (moreWrap) moreWrap.style.display = visibleCount < list.length ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  loadPosts();
  const moreBtn = document.getElementById("load-more-btn");
  if (moreBtn) {
    moreBtn.addEventListener("click", () => {
      visibleCount += 6;
      renderGrid();
    });
  }
  const searchForm = document.getElementById("search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = document.getElementById("search-input").value.trim();
      if (q) location.href = `index.html?q=${encodeURIComponent(q)}`;
    });
  }
});
