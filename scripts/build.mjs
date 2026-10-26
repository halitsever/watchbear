/** Copies apps/landing to dist/ and renders the Markdown posts in blog/posts into static blog pages. */

import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import { parse as parseYaml } from "yaml";
import { SITE, esc, renderFeed, renderIndex, renderPost } from "./blog-templates.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const site = join(root, "apps/landing");
const postsDir = join(site, "blog/posts");
const imgDir = join(site, "blog/img");
/** An optional first argument builds somewhere else, so a preview never clobbers dist/. */
const out = process.argv[2] ? resolve(process.argv[2]) : join(root, "dist");

const DEFAULT_CTA = {
  title: "Start your first watch party",
  text: "Add the free extension, open a video, and send the link. Your friends can join in seconds.",
};

/** Heading ids already taken in the post being rendered, reset per post. */
let usedIds = new Set();

/** Ids on h2 and h3 let search results and shared links jump straight to a section. */
function headingId(text) {
  const base =
    plainText(text)
      .toLowerCase()
      .replace(/&[a-z]+;|[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "section";
  let id = base;
  for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
  usedIds.add(id);
  return id;
}

const marked = new Marked({
  renderer: {
    link({ href, title, tokens }) {
      const external = /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener"' : "";
      const tip = title ? ` title="${esc(title)}"` : "";
      return `<a href="${esc(href)}"${tip}${external}>${this.parser.parseInline(tokens)}</a>`;
    },
    heading({ tokens, depth, text }) {
      const id = depth <= 3 ? ` id="${headingId(text)}"` : "";
      return `<h${depth}${id}>${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
  },
});

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

/** FAQ answers go into JSON-LD, which wants plain text without Markdown syntax. */
function plainText(md) {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

function countWords(md) {
  return plainText(md).split(/\s+/).filter(Boolean).length;
}

/** Search results cut titles around 60 to 70 characters and descriptions around 160. */
function checkLengths(file, seoTitle, description) {
  if (seoTitle.length > 70) console.warn(`${file}: seoTitle is ${seoTitle.length} chars, search results may cut it`);
  if (description.length < 70 || description.length > 165) console.warn(`${file}: description is ${description.length} chars, aim for 120 to 160`);
}

/** Relative links between posts break silently on a renamed slug, so they fail the build instead. */
function checkLinks(post, slugs) {
  for (const [, href] of post.html.matchAll(/href="([^"]+)"/g)) {
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    const path = href.split("#")[0];
    const ok = path.startsWith("../") ? existsSync(join(site, path.slice(3))) : path === "index.html" || slugs.has(path.replace(/\.html$/, ""));
    if (!ok) fail(`${post.slug}.md`, `broken link "${href}"`);
  }
}

function loadPost(file) {
  const source = readFileSync(join(postsDir, file), "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) fail(file, "missing front matter");
  const data = parseYaml(match[1]);
  const body = match[2];

  for (const key of ["title", "description", "dek", "date", "image", "imageAlt"]) {
    if (!data[key]) fail(file, `missing "${key}"`);
  }
  if (!data.photo?.author || !data.photo?.url) fail(file, 'missing "photo.author" or "photo.url"');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date))) fail(file, '"date" must look like 2026-10-26');
  if (!existsSync(join(imgDir, data.image))) fail(file, `image blog/img/${data.image} not found`);

  const slug = basename(file, ".md");
  const seoTitle = data.seoTitle ?? `${data.title} · Watchbear`;
  checkLengths(file, seoTitle, data.description);

  usedIds = new Set();
  const bodyHtml = marked.parse(body);
  const faq = (data.faq ?? []).map((f) => ({ q: f.q, html: marked.parse(f.a), plain: plainText(f.a) }));
  const faqHtml = faq.length
    ? `\n<h2 id="${headingId("Common questions")}">Common questions</h2>\n${faq.map((f) => `<h3 id="${headingId(f.q)}">${esc(f.q)}</h3>\n${f.html}`).join("")}`
    : "";
  const words = countWords(`${body} ${faq.map((f) => `${f.q} ${f.plain}`).join(" ")}`);

  return {
    slug,
    url: `${SITE}/blog/${slug}.html`,
    title: data.title,
    seoTitle,
    description: data.description,
    dek: data.dek,
    excerpt: data.excerpt ?? data.description,
    date: String(data.date),
    updated: String(data.updated ?? data.date),
    image: data.image,
    imageUrl: `${SITE}/blog/img/${data.image}`,
    imageAlt: data.imageAlt,
    photo: data.photo,
    featured: Boolean(data.featured),
    related: data.related ?? [],
    cta: { ...DEFAULT_CTA, ...data.cta },
    faq,
    html: bodyHtml + faqHtml,
    wordCount: words,
    readingTime: Math.max(1, Math.round(words / 200)),
  };
}

/** Explicit picks from front matter first, then the newest other posts. */
function relatedTo(post, posts) {
  const picked = post.related.map((slug) => posts.find((p) => p.slug === slug) ?? fail(`${post.slug}.md`, `related post "${slug}" not found`));
  const rest = posts.filter((p) => p !== post && !picked.includes(p));
  return [...picked, ...rest].slice(0, 2);
}

function sitemapEntries(posts) {
  const entry = (loc, lastmod, changefreq) =>
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  const newest = posts.map((p) => p.updated).sort().at(-1);
  return entry(`${SITE}/blog/`, newest, "weekly") + posts.map((p) => entry(p.url, p.updated, "monthly")).join("");
}

rmSync(out, { recursive: true, force: true });
cpSync(site, out, { recursive: true, filter: (src) => src !== postsDir && basename(src) !== ".DS_Store" });

const posts = readdirSync(postsDir)
  .filter((f) => f.endsWith(".md"))
  .map(loadPost)
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

const slugs = new Set(posts.map((p) => p.slug));
for (const post of posts) {
  checkLinks(post, slugs);
  writeFileSync(join(out, "blog", `${post.slug}.html`), renderPost(post, relatedTo(post, posts)));
}
writeFileSync(join(out, "blog/index.html"), renderIndex(posts));
writeFileSync(join(out, "blog/feed.xml"), renderFeed(posts));

const sitemapPath = join(out, "sitemap.xml");
writeFileSync(sitemapPath, readFileSync(sitemapPath, "utf8").replace("</urlset>", `${sitemapEntries(posts)}</urlset>`));

console.log(`Built ${posts.length} posts into ${out}`);
