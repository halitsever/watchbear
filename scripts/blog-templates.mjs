/** HTML for the blog index and post pages. Output mirrors the hand-written landing pages. */

export const SITE = "https://watchbear.deepfeld.com";
const CHROME_URL = "https://chromewebstore.google.com/detail/watchbear-watch-together/ldegfikaldilbcpgmiopdnnhpkpcnepn";

const BLOG = {
  title: "Watchbear Blog · Watch Party Guides and Movie Night Ideas",
  description:
    "Guides for watching together online: how to host a watch party, watch YouTube and Netflix with friends, and plan movie nights for friends, family and teams.",
  ogDescription: "Watch party guides, movie night ideas, and fixes for the problems that come up when you watch together online.",
};

export function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Keeps a stray "</script>" in post text from closing the JSON-LD block early. */
function jsonLd(data) {
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": data }, null, 2).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">\n${json}\n    </script>`;
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function rfc822(iso) {
  return new Date(`${iso}T00:00:00Z`).toUTCString();
}

function head({ title, description, ogTitle, ogDescription, url, image, imageAlt, imageType, imageWidth, imageHeight, type, published, modified, schema }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <meta name="theme-color" content="#000000" />
    <meta name="color-scheme" content="dark" />

    <meta property="og:type" content="${type}" />
    <meta property="og:site_name" content="Watchbear" />
    <meta property="og:title" content="${esc(ogTitle)}" />
    <meta property="og:description" content="${esc(ogDescription)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:width" content="${imageWidth}" />
    <meta property="og:image:height" content="${imageHeight}" />
    <meta property="og:image:alt" content="${esc(imageAlt)}" />${
      published
        ? `\n    <meta property="article:published_time" content="${published}" />\n    <meta property="article:modified_time" content="${modified}" />`
        : ""
    }

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(ogTitle)}" />
    <meta name="twitter:description" content="${esc(ogDescription)}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:alt" content="${esc(imageAlt)}" />

    <link rel="icon" type="image/svg+xml" href="../bear.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="../icon32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="../icon16.png" />
    <link rel="manifest" href="../site.webmanifest" />
    <link rel="alternate" type="application/rss+xml" title="Watchbear Blog" href="${SITE}/blog/feed.xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="../styles.css" />
    <link rel="stylesheet" href="blog.css" />
    <script src="../nav.js" defer></script>

    ${jsonLd(schema)}
  </head>`;
}

function footer(links) {
  return `    <footer class="foot-wrap">
      <div class="foot">
        <div class="foot-brand">
          <span class="mk"><img src="../bear.svg" alt="Watchbear" width="28" height="28" style="display: block" /></span>
          <span class="tag">Watchbear · watch videos together, in sync</span>
        </div>
        <div class="foot-links">
${links.map(([href, label]) => `          <a href="${href}">${label}</a>`).join("\n")}
        </div>
      </div>
    </footer>
  </body>
</html>
`;
}

function card(post, { featured = false, lazy = true, heading = "h2", full = true } = {}) {
  const meta = full
    ? `<time datetime="${post.date}">${formatDate(post.date)}</time><span class="dot"></span><span>${post.readingTime} min read</span>`
    : `<span>${post.readingTime} min read</span>`;
  return `<a class="post-card${featured ? " featured" : ""}" href="${post.slug}.html">
          <img src="img/${post.image}" alt="${esc(post.imageAlt)}" width="1200" height="675"${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'} />
          <div class="body">
            <div class="meta">${meta}</div>
            <${heading}>${esc(post.title)}</${heading}>${full ? `\n            <p>${esc(post.excerpt)}</p>` : ""}
            <span class="more">${featured ? "Read the guide" : "Read more"} →</span>
          </div>
        </a>`;
}

export function renderIndex(posts) {
  const url = `${SITE}/blog/`;
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p !== featured);
  const schema = [
    {
      "@type": "Blog",
      "@id": `${url}#blog`,
      url,
      name: "Watchbear Blog",
      description: BLOG.description,
      inLanguage: "en",
      isPartOf: { "@id": `${SITE}/#website` },
      publisher: { "@id": `${SITE}/#org` },
      blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: p.url, image: p.imageUrl, datePublished: p.date })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: url },
      ],
    },
  ];

  return `${head({
    title: BLOG.title,
    description: BLOG.description,
    ogTitle: BLOG.title,
    ogDescription: BLOG.ogDescription,
    url,
    image: `${SITE}/og.png`,
    imageAlt: "Watchbear, watch videos together in perfect sync",
    imageType: "image/png",
    imageWidth: 1200,
    imageHeight: 630,
    type: "website",
    schema,
  })}
  <body>
    <wb-nav></wb-nav>

    <main class="wrap">
      <header class="blog-head">
        <span class="eyebrow">Watchbear blog</span>
        <h1>Watching together, <span class="accent">from far apart</span></h1>
        <p>Practical guides for watch parties, YouTube and Netflix nights with friends, and movie dates across time zones.</p>
      </header>

      <div class="post-grid">
        ${[card(featured, { featured: true, lazy: false }), ...rest.map((p) => card(p))].join("\n\n        ")}
      </div>
    </main>

${footer([
  ["../index.html", "Home"],
  ["../teleparty-alternative.html", "Watchbear vs Teleparty"],
  ["../privacy.html", "Privacy Policy"],
])}`;
}

export function renderPost(post, related) {
  const schema = [
    {
      "@type": "BlogPosting",
      "@id": `${post.url}#post`,
      headline: post.title,
      description: post.description,
      image: { "@type": "ImageObject", url: post.imageUrl, width: 1200, height: 675 },
      datePublished: post.date,
      dateModified: post.updated,
      wordCount: post.wordCount,
      inLanguage: "en",
      mainEntityOfPage: post.url,
      isPartOf: { "@id": `${SITE}/blog/#blog` },
      author: { "@id": `${SITE}/#org` },
      publisher: { "@id": `${SITE}/#org` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${post.url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog/` },
        { "@type": "ListItem", position: 3, name: post.title, item: post.url },
      ],
    },
  ];
  if (post.faq.length) {
    schema.push({
      "@type": "FAQPage",
      "@id": `${post.url}#faq`,
      inLanguage: "en",
      mainEntity: post.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.plain } })),
    });
  }

  return `${head({
    title: post.seoTitle,
    description: post.description,
    ogTitle: post.title,
    ogDescription: post.description,
    url: post.url,
    image: post.imageUrl,
    imageAlt: post.imageAlt,
    imageType: "image/jpeg",
    imageWidth: 1200,
    imageHeight: 675,
    type: "article",
    published: post.date,
    modified: post.updated,
    schema,
  })}
  <body>
    <wb-nav></wb-nav>

    <main>
      <article>
        <header class="article">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="../index.html">Home</a><span>/</span><a href="index.html">Blog</a></nav>
          <h1>${esc(post.title)}</h1>
          <p class="dek">${esc(post.dek)}</p>
          <div class="meta"><time datetime="${post.date}">${formatDate(post.date)}</time><span class="dot"></span><span>${post.readingTime} min read</span></div>
        </header>

        <figure class="cover">
          <img src="img/${post.image}" alt="${esc(post.imageAlt)}" width="1200" height="675" fetchpriority="high" />
          <figcaption>Photo by <a href="${esc(post.photo.url)}" target="_blank" rel="noopener">${esc(post.photo.author)}</a> on Pexels</figcaption>
        </figure>

        <div class="prose">
${post.html}
        </div>
      </article>

      <section class="cta-band">
        <div class="band">
          <h2>${esc(post.cta.title)}</h2>
          <p>${esc(post.cta.text)}</p>
          <a href="${CHROME_URL}" target="_blank" rel="noopener" class="btn lg">Add to Chrome</a>
        </div>
      </section>

      <section class="related">
        <div class="wrap">
          <h2>Keep reading</h2>
          <div class="post-grid">
            ${related.map((p) => card(p, { heading: "h3", full: false })).join("\n            ")}
          </div>
        </div>
      </section>
    </main>

${footer([
  ["../index.html", "Home"],
  ["index.html", "Blog"],
  ["../privacy.html", "Privacy Policy"],
])}`;
}

export function renderFeed(posts) {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${p.url}</link>
      <guid>${p.url}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Watchbear Blog</title>
    <link>${SITE}/blog/</link>
    <description>${esc(BLOG.description)}</description>
    <language>en</language>
    <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${rfc822(posts.map((p) => p.updated).sort().at(-1))}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
