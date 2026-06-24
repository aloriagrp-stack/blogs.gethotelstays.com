// initialArticles is now loaded from articles_db.js to keep script.js lightweight

// Load articles from localStorage or fallback
let articles = [];
const savedArticles = localStorage.getItem('gethotel_articles');
if (savedArticles) {
    try {
        articles = JSON.parse(savedArticles);
        // Reset check: if stored article count is outdated, or if any article has mock data, or if Article 1 content is outdated
        const needsReset = articles.length < initialArticles.length || articles.some(art => 
            art.id === 2 || 
            art.id === 3 || 
            art.id === 4 || 
            (art.title && art.title.includes("Tropical Luxury Escapes")) ||
            (art.id === 1 && (!art.content || !art.content.includes('French Quarter hotels in Pondicherry on GetHotelStays')))
        );
        if (needsReset) {
            articles = [...initialArticles];
            localStorage.setItem('gethotel_articles', JSON.stringify(articles));
        }
    } catch (e) {
        articles = [...initialArticles];
    }
} else {
    articles = [...initialArticles];
    localStorage.setItem('gethotel_articles', JSON.stringify(articles));
}

// App State
let activeCategory = 'all';
let searchQuery = '';
let activeArticle = null;

// DOM Views
const blogHomeView = document.getElementById('blog-home-view');
const articlePageView = document.getElementById('article-page-view');

// DOM Elements
const blogGrid = document.getElementById('blog-grid');
// Category tabs element removed
const searchInput = document.getElementById('search-input');
const mobileSearchInput = document.getElementById('mobile-search-input');
const noResults = document.getElementById('no-results');
const clearSearchBtn = document.getElementById('clear-search-btn');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileNav = document.getElementById('mobile-nav');

// Logo / Navigation buttons
const logoBtn = document.getElementById('logo-btn');
const homeLink = document.getElementById('home-link');
const articlesLink = document.getElementById('articles-link');
const mobileHomeLink = document.getElementById('mobile-home-link');
const mobileArticlesLink = document.getElementById('mobile-articles-link');

// Article Page Elements
const backToBlogBtn = document.getElementById('back-to-blog-btn');
const pageArticleContent = document.getElementById('page-article-content');
const commentForm = document.getElementById('comment-form');
const commentAuthorInput = document.getElementById('comment-author');
const commentTextInput = document.getElementById('comment-text');
const commentsList = document.getElementById('comments-list');
const commentCount = document.getElementById('comment-count');

// Newsletter Elements
const subscribeForm = document.getElementById('subscribe-form');
const subscriberEmail = document.getElementById('subscriber-email');
const formFeedback = document.getElementById('form-feedback');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    renderBlogGrid();
    setupEventListeners();
    handleRouting();
});

// Handle simple hash routing
window.addEventListener('hashchange', handleRouting);

function handleRouting() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#article-')) {
        const id = parseInt(hash.replace('#article-', ''));
        if (id) {
            loadArticlePage(id);
            return;
        }
    }
    
    // Fallback/Home
    if (activeArticle) {
        returnToBlogHome();
    }
}

// Save articles array to localStorage
function saveArticles() {
    localStorage.setItem('gethotel_articles', JSON.stringify(articles));
}

// renderCategoryTabs removed

// Render Blog Grid
function renderBlogGrid() {
    let filtered = articles;

    // Filter by Category
    if (activeCategory !== 'all') {
        filtered = filtered.filter(a => a.category === activeCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(a => 
            a.title.toLowerCase().includes(query) || 
            a.excerpt.toLowerCase().includes(query) || 
            a.tags.some(tag => tag.toLowerCase().includes(query))
        );
    }

    // Clear grid
    blogGrid.innerHTML = '';

    if (filtered.length === 0) {
        blogGrid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    blogGrid.style.display = 'grid';
    noResults.style.display = 'none';

    filtered.forEach((article, index) => {
        const card = document.createElement('div');
        
        // If we are in 'all' view and there is no active search query, make the first card featured (double width)
        const isFeaturedCard = index === 0 && activeCategory === 'all' && searchQuery.trim() === '';
        
        card.className = `blog-card ${isFeaturedCard ? 'card-featured' : ''}`;
        card.setAttribute('data-id', article.id);
        
        card.innerHTML = `
            <div class="card-image">
                <img src="${article.image}" alt="${article.title}" class="card-img" loading="lazy" onerror="this.src='assets/resort.webp'">
                <span class="card-badge">${article.categoryName}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${article.title}</h3>
                <p class="card-excerpt">${article.excerpt}</p>
                <div class="card-footer">
                    <div class="card-author">
                        <div class="card-author-avatar">${article.authorInitials}</div>
                        <div>
                            <span class="card-author-name">${article.author}</span>
                            ${article.authorLocation ? `<span class="card-author-location" style="display: block; font-size: 10px; color: var(--text-muted); margin-top: 1px;">📍 ${article.authorLocation}</span>` : ''}
                        </div>
                    </div>
                    <span class="card-date">${article.date}</span>
                </div>
            </div>
        `;

        // Card Click Listener
        card.addEventListener('click', () => {
            loadArticlePage(article.id);
        });

        blogGrid.appendChild(card);
    });
}

// Load Standalone Article Sub-Page
function loadArticlePage(id) {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    activeArticle = article;
    
    // Set URL hash routing
    if (window.location.hash !== `#article-${id}`) {
        window.location.hash = `#article-${id}`;
    }
    
    // Hide home view, show Article view
    blogHomeView.style.display = 'none';
    articlePageView.style.display = 'block';
    
    // Hide navbar on single blog page
    const header = document.getElementById('main-header');
    if (header) {
        header.style.display = 'none';
    }

    // Reset Page Scroll to Top instantly
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Remove old dynamic styles if they exist
    const oldStyle = document.getElementById('dynamic-article-styles');
    if (oldStyle) {
        oldStyle.remove();
    }

    // Remove old dynamic schemas if they exist
    const oldSchemas = document.querySelectorAll('.dynamic-article-schema');
    oldSchemas.forEach(s => s.remove());

    // Extract and inject JSON-LD schemas natively into document head
    const schemaRegex = /<script\s+type=["']application\/ld\+json["'][\s\S]*?>([\s\S]*?)<\/script>/gi;
    let schemaMatch;
    while ((schemaMatch = schemaRegex.exec(article.content)) !== null) {
        const schemaContent = schemaMatch[1];
        const scriptElement = document.createElement('script');
        scriptElement.type = 'application/ld+json';
        scriptElement.className = 'dynamic-article-schema';
        scriptElement.textContent = schemaContent.trim();
        document.head.appendChild(scriptElement);
    }

    // Extract, compile and inject the style blocks natively into document head
    const styleBlocks = [];
    const styleRegex = /<style[\s\S]*?>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = styleRegex.exec(article.content)) !== null) {
        styleBlocks.push(m[1]);
    }
    
    if (styleBlocks.length > 0) {
        const rawCss = styleBlocks.join('\n');
        // Clean CSS comments
        const cleanCss = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
        const imports = [];
        // Extract imports with the robust regex
        let scopedCss = cleanCss.replace(/@import\s+url\([^)]+\);/gi, (imp) => {
            imports.push(imp);
            return '';
        });
        const compiledCss = prefixCssSelectors(scopedCss, '.article-body');
        
        const styleElement = document.createElement('style');
        styleElement.id = 'dynamic-article-styles';
        styleElement.textContent = imports.join('\n') + '\n' + compiledCss;
        document.head.appendChild(styleElement);
    }

    // Detect if this is a full HTML/Blogger template (e.g. has doctype/html or its own hero banner)
    const contentLower = article.content.toLowerCase();
    const isFullHtml = contentLower.includes('<!doctype') || 
                       contentLower.includes('<!--doctype') ||
                       contentLower.includes('<html') ||
                       contentLower.includes('<body') ||
                       contentLower.includes('class="hero"');

    if (isFullHtml) {
        articlePageView.classList.add('full-width-view');
        pageArticleContent.classList.add('full-width-template');
        
        // Render ONLY the custom HTML content without duplicate parent headers/cover images
        pageArticleContent.innerHTML = `
            <div class="article-body">
                ${cleanArticleHTML(article.content)}
            </div>
        `;
    } else {
        articlePageView.classList.remove('full-width-view');
        pageArticleContent.classList.remove('full-width-template');
        
        // Render standard simple card layout with parent cover image & headers
        pageArticleContent.innerHTML = `
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
                ${cleanArticleHTML(article.content)}
            </div>

            <!-- Dynamic SEO Tags Row -->
            ${article.tags && article.tags.length > 0 ? `
            <div class="article-tags-row" style="margin-top: 32px; display: flex; flex-wrap: wrap; gap: 8px;">
                ${article.tags.map(tag => `<span class="tag-pill" style="cursor: pointer; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.1); color: var(--primary); transition: var(--transition);" onclick="filterByTag('${escapeJSString(tag)}')">#${tag}</span>`).join('')}
            </div>
            ` : ''}

            <!-- Share Row -->
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

    // Dynamic SEO Metadata updates
    document.title = `${article.title} - GetHotel Stays Blog`;
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
    }
    metaDescription.content = article.excerpt || '';

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = (article.tags || []).join(', ');

    // Render Comments
    renderComments();

    // Adjust Nav Active Indicator
    updateNavSelection('articles');
}

// Return back to Blog Grid Listing
function returnToBlogHome() {
    if (window.location.pathname.includes('article-')) {
        window.location.href = 'index.html';
        return;
    }
    // Remove dynamic article styles
    const oldStyle = document.getElementById('dynamic-article-styles');
    if (oldStyle) {
        oldStyle.remove();
    }
    
    // Remove dynamic article schemas
    const oldSchemas = document.querySelectorAll('.dynamic-article-schema');
    oldSchemas.forEach(s => s.remove());
    
    // Clear hash routing if active
    if (window.location.hash !== '') {
        // Prevents scroll jump on hash removal
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    
    articlePageView.style.display = 'none';
    blogHomeView.style.display = 'block';
    
    // Restore navbar on home page
    const header = document.getElementById('main-header');
    if (header) {
        header.style.display = '';
    }
    
    // Set scroll back to top of main landing page
    window.scrollTo({ top: 0, behavior: 'instant' });

    activeArticle = null;

    // Restore default SEO metadata
    document.title = "GetHotel Stays Blog - Curated Travel Guides & Tips";
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.content = "Discover premium travel guides, local culinary delights, hotel review tips, and outdoor adventure stories on the official GetHotel Stays Blog.";
    }
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
        metaKeywords.content = "travel, hotel stays, guides, adventure, culinary, culture";
    }

    // Adjust Nav Active Indicator
    updateNavSelection('home');
}

// Filter posts by clicking tags
window.filterByTag = function(tag) {
    returnToBlogHome();
    searchInput.value = tag;
    mobileSearchInput.value = tag;
    searchQuery = tag;
    activeCategory = 'all';
    
    // Visual selection reset removed

    renderBlogGrid();

    // Scroll to articles section
    setTimeout(() => {
        const sect = document.getElementById('articles-section');
        if (sect) sect.scrollIntoView({ behavior: 'smooth' });
    }, 100);
};

// Escape special characters for inline JS call parameters
function escapeJSString(str) {
    return str.replace(/'/g, "\\'");
}

// Helper to prefix CSS selectors to scope them to the article container
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

// Scope nested stylesheet in blogger article content to prevent outer page pollution
function scopeArticleHTML(html) {
    if (!html) return '';
    
    // Clean CSS comments to prevent selector prefixing issues
    let scopedCss = html.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Extract all @import statements
    const imports = [];
    scopedCss = scopedCss.replace(/@import\s+url\([^)]+\);/gi, (imp) => {
        imports.push(imp);
        return '';
    });
    
    // Prefix all selectors with .article-body to achieve absolute scoping in standard CSS
    const compiledCss = prefixCssSelectors(scopedCss, '.article-body');
    
    return imports.join('\n') + '\n' + compiledCss;
}

// Extracts only the child elements of body to prevent nesting html/body tags and strips style/schema blocks
function cleanArticleHTML(html) {
    if (!html) return '';
    
    // Try to extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let clean = html;
    if (bodyMatch) {
        clean = bodyMatch[1];
    }
    
    // Strip any style blocks and application/ld+json script blocks
    clean = clean.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
    clean = clean.replace(/<script\s+type=["']application\/ld\+json["'][\s\S]*?>[\s\S]*?<\/script>/gi, '');
    return clean;
}

// Helper to update navigation active elements
function updateNavSelection(activeTabName) {
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('data-nav') === activeTabName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Render Comments
function renderComments() {
    if (!activeArticle) return;
    
    commentsList.innerHTML = '';
    commentCount.textContent = activeArticle.comments.length;

    if (activeArticle.comments.length === 0) {
        commentsList.innerHTML = '<p style="color: var(--text-muted); font-style: italic; text-align: center;">No comments yet. Be the first to share your thoughts!</p>';
        return;
    }

    activeArticle.comments.forEach(comment => {
        const initials = comment.author.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.innerHTML = `
            <div class="comment-avatar">${initials}</div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author-name">${comment.author}</span>
                    <span class="comment-date">${comment.date}</span>
                </div>
                <p class="comment-text">${comment.text}</p>
            </div>
        `;
        commentsList.appendChild(commentItem);
    });
}

// Event Listeners
function setupEventListeners() {
    // Scroll event listener for floating header
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        if (window.scrollY > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Logo click returns home
    logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        returnToBlogHome();
    });

    // Navbar links navigation routing
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        returnToBlogHome();
    });

    mobileHomeLink.addEventListener('click', (e) => {
        e.preventDefault();
        returnToBlogHome();
        mobileNav.classList.remove('active');
    });

    articlesLink.addEventListener('click', (e) => {
        e.preventDefault();
        returnToBlogHome();
        // Smooth scroll to articles section
        document.getElementById('articles-section').scrollIntoView({ behavior: 'smooth' });
    });

    mobileArticlesLink.addEventListener('click', (e) => {
        e.preventDefault();
        returnToBlogHome();
        mobileNav.classList.remove('active');
        setTimeout(() => {
            document.getElementById('articles-section').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    });

    // Back button click returns to blog listing
    backToBlogBtn.addEventListener('click', returnToBlogHome);

    // Category tabs filter removed

    // Real-time Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderBlogGrid();
    });

    mobileSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderBlogGrid();
    });

    // Clear Search & Filters
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        mobileSearchInput.value = '';
        searchQuery = '';
        activeCategory = 'all';
        
        // Reset category tabs visual removed

        renderBlogGrid();
    });

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
    });

    // Close menu drawer if home/article links are clicked
    const drawerLinks = mobileNav.querySelectorAll('.mobile-nav-link');
    drawerLinks.forEach(l => {
        l.addEventListener('click', () => {
            mobileNav.classList.remove('active');
        });
    });

    // Submit Comment Form
    commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!activeArticle) return;

        const authorName = commentAuthorInput.value.trim();
        const commentText = commentTextInput.value.trim();

        if (authorName && commentText) {
            const newComment = {
                author: authorName,
                date: "Today",
                text: commentText
            };

            // Add to database
            activeArticle.comments.unshift(newComment); // Add to top

            // Save and re-render
            saveArticles();
            renderComments();

            // Reset Form inputs
            commentAuthorInput.value = '';
            commentTextInput.value = '';
        }
    });

    // Newsletter subscription form
    subscribeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = subscriberEmail.value.trim();
        
        if (email) {
            // Custom premium success response animation
            formFeedback.textContent = '';
            formFeedback.className = 'form-feedback';
            
            // Mocking server request delay
            const submitBtn = subscribeForm.querySelector('button');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Subscribing...';

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                
                // Show positive response
                formFeedback.className = 'form-feedback success';
                formFeedback.textContent = '✨ Success! You are now subscribed to the GetHotelStays Blog newsletter.';
                subscriberEmail.value = '';

                // Reset success message after 5 seconds
                setTimeout(() => {
                    formFeedback.textContent = '';
                }, 5000);
            }, 1200);
        }
    });
}
