// ============================================================
// World Insight — admin panel (owner-only publishing)
// Auth is Supabase email/password. Public signup is disabled
// in the Supabase dashboard, so only the account you create
// there can ever log in here.
// ============================================================

const loginCard = document.getElementById("login-card");
const dashCard = document.getElementById("dashboard-card");
const editorCard = document.getElementById("editor-card");
const listCard = document.getElementById("list-card");

function showMsg(el, text, ok) {
  el.textContent = text;
  el.className = "admin-msg " + (ok ? "ok" : "err");
}

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function refreshSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    loginCard.style.display = "none";
    dashCard.style.display = "block";
    editorCard.style.display = "block";
    listCard.style.display = "block";
    document.getElementById("admin-email").textContent = session.user.email;
    loadMyPosts();
  } else {
    loginCard.style.display = "block";
    dashCard.style.display = "none";
    editorCard.style.display = "none";
    listCard.style.display = "none";
  }
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const msg = document.getElementById("login-msg");
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    showMsg(msg, error.message, false);
  } else {
    msg.className = "admin-msg";
    refreshSession();
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  refreshSession();
});

// ---------- Create / update post ----------
const postForm = document.getElementById("post-form");
let editingId = null;

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("editor-msg");
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Publishing…";

  try {
    const title = document.getElementById("f-title").value.trim();
    const category = document.getElementById("f-category").value.trim() || "World";
    const excerpt = document.getElementById("f-excerpt").value.trim();
    const content = document.getElementById("f-content").value.trim();
    const published = document.getElementById("f-published").checked;
    const fileInput = document.getElementById("f-image");
    let imageUrl = document.getElementById("f-existing-image").value || null;

    if (!title || !content) throw new Error("Title and article text are required.");

    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${file.name.split(".").pop()}`;
      const { error: upErr } = await supabaseClient.storage.from("post-images").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabaseClient.storage.from("post-images").getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

    const slug = editingId ? document.getElementById("f-slug").value : slugify(title) + "-" + Date.now().toString(36);

    const payload = { title, slug, category, excerpt, content, cover_image_url: imageUrl, published };

    let error;
    if (editingId) {
      ({ error } = await supabaseClient.from("posts").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabaseClient.from("posts").insert(payload));
    }
    if (error) throw error;

    showMsg(msg, editingId ? "Article updated." : "Article published.", true);
    resetForm();
    loadMyPosts();
  } catch (err) {
    showMsg(document.getElementById("editor-msg"), err.message || "Something went wrong.", false);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Publish Article";
  }
});

function resetForm() {
  postForm.reset();
  editingId = null;
  document.getElementById("f-existing-image").value = "";
  document.getElementById("editor-title").textContent = "Write a New Article";
  document.getElementById("submit-btn").textContent = "Publish Article";
  document.getElementById("cancel-edit-btn").style.display = "none";
}

document.getElementById("cancel-edit-btn").addEventListener("click", resetForm);

// ---------- List / edit / delete ----------
async function loadMyPosts() {
  const { data, error } = await supabaseClient
    .from("posts")
    .select("id, title, slug, published, created_at")
    .order("created_at", { ascending: false });

  const wrap = document.getElementById("my-posts");
  if (error) {
    wrap.innerHTML = `<div class="state-msg">Could not load your articles.</div>`;
    return;
  }
  if (!data || data.length === 0) {
    wrap.innerHTML = `<div class="state-msg">No articles yet — publish your first one above.</div>`;
    return;
  }
  wrap.innerHTML = data.map(p => `
    <div class="post-row">
      <span>${p.published ? "🟢" : "⚪"} ${p.title}</span>
      <span class="actions">
        <a href="post.html?slug=${encodeURIComponent(p.slug)}" target="_blank">View</a>
        <button data-edit="${p.id}">Edit</button>
        <button data-del="${p.id}" class="danger">Delete</button>
      </span>
    </div>
  `).join("");

  wrap.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => editPost(btn.dataset.edit));
  });
  wrap.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deletePost(btn.dataset.del));
  });
}

async function editPost(id) {
  const { data, error } = await supabaseClient.from("posts").select("*").eq("id", id).single();
  if (error || !data) return;
  editingId = id;
  document.getElementById("f-title").value = data.title;
  document.getElementById("f-category").value = data.category || "";
  document.getElementById("f-excerpt").value = data.excerpt || "";
  document.getElementById("f-content").value = data.content || "";
  document.getElementById("f-published").checked = data.published;
  document.getElementById("f-slug").value = data.slug;
  document.getElementById("f-existing-image").value = data.cover_image_url || "";
  document.getElementById("editor-title").textContent = "Edit Article";
  document.getElementById("submit-btn").textContent = "Save Changes";
  document.getElementById("cancel-edit-btn").style.display = "inline-block";
  window.scrollTo({ top: editorCard.offsetTop - 20, behavior: "smooth" });
}

async function deletePost(id) {
  if (!confirm("Delete this article permanently?")) return;
  const { error } = await supabaseClient.from("posts").delete().eq("id", id);
  if (!error) loadMyPosts();
}

document.addEventListener("DOMContentLoaded", refreshSession);
