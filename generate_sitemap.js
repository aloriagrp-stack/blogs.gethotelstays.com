const fs = require('fs');
const path = require('path');
const initialArticles = require('./articles_db.js');

const DOMAIN = 'https://blogs.gethotelstays.com';
const today = new Date().toISOString().split('T')[0];

// ── robots.txt ──
const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /*?*
Disallow: /*#*

Sitemap: ${DOMAIN}/sitemap.xml

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Bytespider
Allow: /
`;

fs.writeFileSync(path.join(__dirname, 'robots.txt'), robotsTxt, 'utf8');
console.log('Generated robots.txt');

// ── sitemap.xml ──
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

initialArticles.forEach(article => {
    const slug = article.slug || `article-${article.id}`;
    sitemap += `  <url>
    <loc>${DOMAIN}/${slug}.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
});

sitemap += '</urlset>';
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Generated sitemap.xml with ${initialArticles.length + 1} URLs`);
