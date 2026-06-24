const fs = require('fs');
const path = require('path');
const initialArticles = require('./articles_db.js');

const templatePath = path.join(__dirname, 'index.html');
const template = fs.readFileSync(templatePath, 'utf8');

function prefixCssSelectors(css, prefix) {
    let result = '';
    let depth = 0;
    let selectorBuffer = '';
    let contentBuffer = '';
    let insideMedia = false;
    
    for (let i = 0; i < css.length; i++) {
        const char = css[i];
        
        if (char === '{') {
            depth++;
            if (depth === 1) {
                let selector = selectorBuffer.trim();
                if (selector.startsWith('@media')) {
                    result += selector + ' {';
                    insideMedia = true;
                    selectorBuffer = '';
                } else if (selector.startsWith('@keyframes') || selector.startsWith('@import')) {
                    result += selector + ' {';
                    selectorBuffer = '';
                } else {
                    const prefixed = selector.split(',').map(s => {
                        let trimmed = s.trim();
                        if (!trimmed) return '';
                        if (trimmed === 'body' || trimmed === 'html' || trimmed === ':root') {
                            return prefix;
                        }
                        if (trimmed.startsWith('body ') || trimmed.startsWith('html ')) {
                            return trimmed.replace(/^(body|html)/, prefix);
                        }
                        return prefix + ' ' + trimmed;
                    }).filter(Boolean).join(', ');
                    result += prefixed + ' {';
                    selectorBuffer = '';
                }
            } else {
                contentBuffer += char;
            }
        } else if (char === '}') {
            depth--;
            if (depth === 0) {
                if (insideMedia) {
                    result += prefixCssSelectors(contentBuffer, prefix) + '}';
                    insideMedia = false;
                } else {
                    result += contentBuffer + '}';
                }
                contentBuffer = '';
                selectorBuffer = '';
            } else {
                contentBuffer += char;
            }
        } else {
            if (depth === 0) {
                selectorBuffer += char;
            } else {
                contentBuffer += char;
            }
        }
    }
    if (selectorBuffer) result += selectorBuffer;
    return result;
}

function cleanArticleHTML(html) {
    if (!html) return '';
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let clean = html;
    if (bodyMatch) {
        clean = bodyMatch[1];
    }
    clean = clean.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
    clean = clean.replace(/<script\s+type=["']application\/ld\+json["'][\s\S]*?>[\s\S]*?<\/script>/gi, '');
    return clean;
}

console.log(`Starting static page generation for ${initialArticles.length} articles...`);

initialArticles.forEach((article) => {
    let pageHtml = template;

    // 1. Update Title and Meta tags in Head
    const titleRegex = /<title>[\s\S]*?<\/title>/i;
    pageHtml = pageHtml.replace(titleRegex, `<title>${article.title} - GetHotel Stays Blog</title>`);

    const descRegex = /<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(descRegex, `<meta name="description" content="${article.excerpt.replace(/"/g, '&quot;')}">`);

    const keyRegex = /<meta\s+name=["']keywords["']\s+content=["'][\s\S]*?["']\s*\/?>/i;
    const articleKeywords = (article.tags || []).join(', ');
    pageHtml = pageHtml.replace(keyRegex, `<meta name="keywords" content="${articleKeywords.replace(/"/g, '&quot;')}">`);

    // 2. Update Open Graph Meta tags in Head
    const ogUrlRegex = /<meta\s+property=["']og:url["']\s+content=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(ogUrlRegex, `<meta property="og:url" content="https://blogs.gethotelstays.com/article-${article.id}.html">`);

    const ogTitleRegex = /<meta\s+property=["']og:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(ogTitleRegex, `<meta property="og:title" content="${article.title.replace(/"/g, '&quot;')}">`);

    const ogDescRegex = /<meta\s+property=["']og:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(ogDescRegex, `<meta property="og:description" content="${article.excerpt.replace(/"/g, '&quot;')}">`);

    const ogImageRegex = /<meta\s+property=["']og:image["']\s+content=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(ogImageRegex, `<meta property="og:image" content="${article.image}">`);

    const canonicalRegex = /<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(canonicalRegex, `<link rel="canonical" href="https://blogs.gethotelstays.com/article-${article.id}.html" />`);

    // 3. Extract Styles
    const styleBlocks = [];
    const styleRegex = /<style[\s\S]*?>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = styleRegex.exec(article.content)) !== null) {
        styleBlocks.push(m[1]);
    }
    let compiledCssBlock = '';
    if (styleBlocks.length > 0) {
        const rawCss = styleBlocks.join('\n');
        const cleanCss = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
        const imports = [];
        let scopedCss = cleanCss.replace(/@import\s+url\([^)]+\);/gi, (imp) => {
            imports.push(imp);
            return '';
        });
        const compiledCss = prefixCssSelectors(scopedCss, '.article-body');
        compiledCssBlock = `<style id="dynamic-article-styles">\n${imports.join('\n')}\n${compiledCss}\n</style>`;
    }

    // 4. Extract Schemas
    const schemaBlocks = [];
    const schemaRegex = /<script\s+type=["']application\/ld\+json["'][\s\S]*?>([\s\S]*?)<\/script>/gi;
    let schemaMatch;
    while ((schemaMatch = schemaRegex.exec(article.content)) !== null) {
        const schemaContent = schemaMatch[1];
        schemaBlocks.push(`<script type="application/ld+json" class="dynamic-article-schema">\n${schemaContent.trim()}\n</script>`);
    }

    // Inject styles and schemas before </head>
    const headCloseIndex = pageHtml.indexOf('</head>');
    if (headCloseIndex !== -1) {
        const injectedHead = `${compiledCssBlock}\n${schemaBlocks.join('\n')}\n`;
        pageHtml = pageHtml.slice(0, headCloseIndex) + injectedHead + pageHtml.slice(headCloseIndex);
    }

    // 5. Hide Blog Home View and Show Article View
    pageHtml = pageHtml.replace('<div id="blog-home-view">', '<div id="blog-home-view" style="display: none;">');
    pageHtml = pageHtml.replace('<div class="article-page-view" id="article-page-view" style="display: none;">', '<div class="article-page-view" id="article-page-view" style="display: block;">');
    
    // Hide main-header on load for standalone page (to match SPA load behavior)
    pageHtml = pageHtml.replace('<header class="main-header" id="main-header">', '<header class="main-header" id="main-header" style="display: none;">');

    // 6. Build Article DOM Markup
    const contentLower = article.content.toLowerCase();
    const isFullHtml = contentLower.includes('<!doctype') || 
                       contentLower.includes('<!--doctype') ||
                       contentLower.includes('<html') ||
                       contentLower.includes('<body') ||
                       contentLower.includes('class="hero"');

    let articleMarkup = '';
    const cleanContent = cleanArticleHTML(article.content);

    if (isFullHtml) {
        // Add full-width-view classes to match script.js load behavior
        pageHtml = pageHtml.replace('class="article-page-view" id="article-page-view"', 'class="article-page-view full-width-view" id="article-page-view"');
        pageHtml = pageHtml.replace('class="page-article-content" id="page-article-content"', 'class="page-article-content full-width-template" id="page-article-content"');
        
        articleMarkup = `
            <div class="article-body">
                ${cleanContent}
            </div>
        `;
    } else {
        articleMarkup = `
            <header class="modal-article-header">
                <span class="category-badge">${article.categoryName}</span>
                <h1 class="modal-article-title">${article.title}</h1>
                <div class="post-meta" style="margin-bottom: 0; border: none; padding-top: 0;">
                    <div class="author-info">
                        <div class="author-avatar-placeholder">${article.authorInitials}</div>
                        <div>
                            <div class="author-name">${article.author}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">
                                ${article.authorLocation ? `${article.authorLocation} • ` : ''}Published on ${article.date}
                            </div>
                        </div>
                    </div>
                    <div class="meta-details">
                        <span class="meta-item">
                            <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            ${article.readTime || '5 min read'}
                        </span>
                    </div>
                </div>
            </header>

            <div class="modal-cover-image-container">
                <img src="${article.image}" alt="${article.title}" class="modal-cover-image" onerror="this.src='assets/resort.webp'">
            </div>

            <div class="article-body">
                ${cleanContent}
            </div>

            ${article.tags && article.tags.length > 0 ? `
            <div class="article-tags-row" style="margin-top: 32px; display: flex; flex-wrap: wrap; gap: 8px;">
                ${article.tags.map(tag => `<span class="tag-pill" style="cursor: pointer; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.1); color: var(--primary); transition: var(--transition);">#${tag}</span>`).join('')}
            </div>
            ` : ''}

            <div class="article-share-row">
                <span class="share-title">Enjoyed the story? Share it:</span>
                <div class="share-buttons">
                    <button class="share-btn" onclick="alert('Link copied to clipboard!')" aria-label="Copy Link">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
                    <button class="share-btn" onclick="alert('Shared on Twitter!')" aria-label="Share on Twitter">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
                    </button>
                    <button class="share-btn" onclick="alert('Shared on Facebook!')" aria-label="Share on Facebook">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }

    // 7. Inject Article Markup
    pageHtml = pageHtml.replace('<article class="page-article-content" id="page-article-content">', `<article class="page-article-content" id="page-article-content">\n${articleMarkup}`);

    // 8. Write file to disk
    const outputFilename = `article-${article.id}.html`;
    const outputPath = path.join(__dirname, outputFilename);
    fs.writeFileSync(outputPath, pageHtml, 'utf8');
    console.log(`Generated ${outputFilename}`);
});

console.log('All static pages generated successfully.');
