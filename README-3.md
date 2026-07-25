# World Insight — Setup Guide

A fast, static, SEO-friendly news/blog site. Readers never log in. Only you can
publish, from `/admin.html`, which is password-protected and blocked from
search engines.

## 1. Security — do this first

You shared your Supabase **secret key** in plain chat. Rotate it now:
Supabase Dashboard → Settings → API → click **Roll** next to the secret key.
This project never uses the secret key in the browser, so rotating it will
not break anything here — nothing in this codebase references it.

## 2. Create the database table

In Supabase Dashboard → SQL Editor, run:

```sql
create extension if not exists pgcrypto;

create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null,
  category text default 'World',
  cover_image_url text,
  published boolean default true,
  created_at timestamptz default now()
);

alter table posts enable row level security;

-- Anyone can read published posts (this is what powers the public site)
create policy "Public can read published posts"
  on posts for select
  using (published = true);

-- Only a signed-in user (you) can create, edit, or delete
create policy "Owner can manage posts"
  on posts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```

## 3. Create the image storage bucket

Dashboard → Storage → New bucket:
- Name: `post-images`
- Public bucket: **ON**

Then Storage → Policies → add a policy on `post-images` allowing
`authenticated` users to `INSERT`, and `public`/`anon` to `SELECT`
(this is usually the default for a public bucket).

## 4. Create your admin login (disable public sign-up)

Dashboard → Authentication → Providers → Email:
- Turn **OFF** "Allow new users to sign up" (so no one else can ever register).

Dashboard → Authentication → Users → Add user:
- Enter your own email + a strong password. This is the only account that
  can ever sign in at `/admin.html`.

## 5. Deploy to Netlify

1. Push this folder to a GitHub repo, or drag-and-drop the folder into
   Netlify's dashboard ("Deploys" → "Deploy manually").
2. Once live, your URL will be something like `random-name.netlify.app`.
   Go to **Site configuration → Change site name** and set it to your
   preferred subdomain (e.g. `world-insight.netlify.app`).
3. **Important:** if you change the site name, update the four instances of
   `https://world-insight.netlify.app` in `index.html`, `post.html`,
   `about.html`, `contact.html`, `privacy-policy.html`, `disclaimer.html`,
   `terms.html`, `dmca.html`, `robots.txt`, `sitemap.xml`, and
   `netlify/functions/sitemap.js` to match.
4. Netlify Forms (used by the Contact page) work automatically once
   deployed on Netlify — no extra setup needed. Submissions appear under
   Site → Forms in your Netlify dashboard.

## 6. Publish your first article

Go to `yoursite.netlify.app/admin.html`, sign in, and use the "Write a New
Article" form. Upload a cover photo, write your text (leave a blank line
between paragraphs), and click Publish. It appears on the homepage
immediately — no rebuild needed.

## 7. Before applying for AdSense

- Publish at least 15–20 full, original articles (300+ words each).
- Make sure Privacy Policy, Disclaimer, Terms, About, Contact, and DMCA
  pages are live (they already are, at the file names above).
- Write everything in one consistent language per page — AdSense flags
  mixed-language content as an "Unsupported language" issue.
- Avoid thin, duplicate, or copy-pasted content — write every article in
  your own words.
