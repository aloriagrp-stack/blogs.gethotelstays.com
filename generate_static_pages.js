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
    const slug = article.slug || `article-${article.id}`;
    pageHtml = pageHtml.replace(ogUrlRegex, `<meta property="og:url" content="https://blogs.gethotelstays.com/${slug}.html">`);

    const ogTitleRegex = /<meta\s+property=["']og:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(ogTitleRegex, `<meta property="og:title" content="${article.title.replace(/"/g, '&quot;')}">`);

    const ogDescRegex = /<meta\s+property=["']og:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(ogDescRegex, `<meta property="og:description" content="${article.excerpt.replace(/"/g, '&quot;')}">`);

    const ogImageRegex = /<meta\s+property=["']og:image["']\s+content=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(ogImageRegex, `<meta property="og:image" content="${article.image}">`);

    const canonicalRegex = /<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']\s*\/?>/i;
    pageHtml = pageHtml.replace(canonicalRegex, `<link rel="canonical" href="https://blogs.gethotelstays.com/${slug}.html" />`);

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

    // 4. Extract existing schemas from article content
    const schemaBlocks = [];
    const schemaRegex = /<script\s+type=["']application\/ld\+json["'][\s\S]*?>([\s\S]*?)<\/script>/gi;
    let schemaMatch;
    while ((schemaMatch = schemaRegex.exec(article.content)) !== null) {
        const schemaContent = schemaMatch[1];
        schemaBlocks.push(`<script type="application/ld+json" class="dynamic-article-schema">\n${schemaContent.trim()}\n</script>`);
    }

    // ── 4B. Generate Enterprise-Level Schemas ──
    const articleUrl = `https://blogs.gethotelstays.com/${slug}.html`;
    const siteUrl = 'https://blogs.gethotelstays.com';
    const imageUrl = article.image || 'https://blogs.gethotelstays.com/assets/resort.webp';
    const datePublished = article.date || new Date().toISOString().split('T')[0];
    const authorName = article.author || 'GetHotelStays Travel Team';

    // Article Schema (Article + BlogPosting)
    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.excerpt,
        "image": imageUrl,
        "author": { "@type": "Organization", "name": authorName, "url": siteUrl },
        "publisher": {
            "@type": "Organization",
            "name": "GetHotelStays",
            "url": siteUrl,
            "logo": { "@type": "ImageObject", "url": `${siteUrl}/assets/logo.png` }
        },
        "datePublished": datePublished,
        "dateModified": datePublished,
        "mainEntityOfPage": { "@type": "WebPage", "@id": articleUrl },
        "articleSection": article.categoryName,
        "keywords": (article.tags || []).join(', '),
        "wordCount": (article.content || '').split(/\s+/).filter(w => w.length > 0).length,
        "inLanguage": "en",
        "about": { "@type": "Thing", "name": article.categoryName }
    };
    schemaBlocks.push(`<script type="application/ld+json" class="dynamic-article-schema">\n${JSON.stringify(articleSchema, null, 2)}\n</script>`);

    // BreadcrumbList Schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
            { "@type": "ListItem", "position": 2, "name": article.categoryName, "item": `${siteUrl}/#${article.category}` },
            { "@type": "ListItem", "position": 3, "name": article.title, "item": articleUrl }
        ]
    };
    schemaBlocks.push(`<script type="application/ld+json" class="dynamic-article-schema">\n${JSON.stringify(breadcrumbSchema, null, 2)}\n</script>`);

    // Organization Schema (runs once but included per page for AI crawlers)
    const orgSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "GetHotelStays",
        "url": "https://gethotelstays.com",
        "logo": "https://gethotelstays.com/assets/logo.png",
        "description": "India's premium hotel booking and travel guide platform",
        "sameAs": [
            "https://www.facebook.com/gethotelstays",
            "https://www.instagram.com/gethotelstays",
            "https://twitter.com/gethotelstays"
        ],
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "availableLanguage": ["English", "Hindi"]
        }
    };
    schemaBlocks.push(`<script type="application/ld+json" class="dynamic-article-schema">\n${JSON.stringify(orgSchema, null, 2)}\n</script>`);

    // WebSite Schema with SearchAction
    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "GetHotelStays Blog",
        "url": siteUrl,
        "potentialAction": {
            "@type": "SearchAction",
            "target": `${siteUrl}/?search={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    };
    schemaBlocks.push(`<script type="application/ld+json" class="dynamic-article-schema">\n${JSON.stringify(websiteSchema, null, 2)}\n</script>`);

    // FAQ Schema (AEO - Answer Engine Optimization)
    if (article.faq && article.faq.length > 0) {
        const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": article.faq.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": faq.answer
                }
            }))
        };
        schemaBlocks.push(`<script type="application/ld+json" class="dynamic-article-schema">\n${JSON.stringify(faqSchema, null, 2)}\n</script>`);
    }

    // GEO Schema - Citations, Claims, Entities (Generative Engine Optimization)
    if (article.geo) {
        const geoSchema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": articleUrl,
            "mainEntity": {
                "@type": "Thing",
                "name": article.title,
                "description": article.excerpt,
                "identifier": slug
            },
            "about": (article.geo.entities || []).map(entity => ({
                "@type": "Thing",
                "name": entity
            })),
            "citation": (article.geo.citations || []).map(cit => ({
                "@type": "Citation",
                "name": cit.source,
                "url": cit.url,
                "description": cit.claim
            })),
            "claimReviewed": (article.geo.claims || []).map(claim => ({
                "@type": "Claim",
                "text": claim,
                "reviewedBy": {
                    "@type": "Organization",
                    "name": "GetHotelStays Editorial"
                }
            }))
        };
        schemaBlocks.push(`<script type="application/ld+json" class="dynamic-article-schema">\n${JSON.stringify(geoSchema, null, 2)}\n</script>`);
    }

    // Inject styles and all schemas before </head>
    const headCloseIndex = pageHtml.indexOf('</head>');
    if (headCloseIndex !== -1) {
        // Add Twitter Card meta tags
        const twitterMeta = `
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@gethotelstays">
    <meta name="twitter:creator" content="@gethotelstays">
    <meta name="twitter:title" content="${article.title.replace(/"/g, '&quot;')}">
    <meta name="twitter:description" content="${article.excerpt.replace(/"/g, '&quot;')}">
    <meta name="twitter:image" content="${imageUrl}">`;
        
        // Add additional SEO meta tags
        const seoMeta = `
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="author" content="${authorName}">
    <meta name="geo.region" content="IN-DL">
    <meta name="geo.placename" content="Delhi">
    <link rel="alternate" hreflang="en" href="${articleUrl}">
    <link rel="alternate" hreflang="hi" href="${articleUrl}">
    <meta property="article:published_time" content="${datePublished}">
    <meta property="article:modified_time" content="${datePublished}">
    <meta property="article:section" content="${article.categoryName}">
    <meta property="article:tag" content="${(article.tags || []).join(', ')}">`;
        
        const injectedHead = `${seoMeta}\n${twitterMeta}\n${compiledCssBlock}\n${schemaBlocks.join('\n')}\n`;
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
    const outputFilename = `${slug}.html`;
    const outputPath = path.join(__dirname, outputFilename);
    fs.writeFileSync(outputPath, pageHtml, 'utf8');
    console.log(`Generated ${outputFilename}`);
});

console.log('All static pages generated successfully.');
