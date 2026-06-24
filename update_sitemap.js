const fs = require('fs');
const path = require('path');

const sitemapPath = path.join(__dirname, 'sitemap.xml');
let content = fs.readFileSync(sitemapPath, 'utf8');

// Replace all #article-X with article-X.html
content = content.replace(/#article-([0-9]+)/g, 'article-$1.html');

fs.writeFileSync(sitemapPath, content, 'utf8');
console.log('Sitemap updated successfully with static HTML pages!');
