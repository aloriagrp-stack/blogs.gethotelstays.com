// initialArticles is now loaded from articles_db.js to keep admin.js lightweight

// Load articles from localStorage or fallback
let articles = [];
const savedArticles = localStorage.getItem('gethotel_articles');
if (savedArticles) {
    try {
        articles = JSON.parse(savedArticles);
        // Reset check: if any article has the mock titles or IDs 2, 3, 4
        const hasMockData = articles.some(art => art.id === 2 || art.id === 3 || art.id === 4 || (art.title && art.title.includes("Tropical Luxury Escapes")) || (art.id === 1 && (!art.content || !art.content.includes('French Quarter hotels in Pondicherry on GetHotelStays'))));
        if (hasMockData) {
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

// DOM Elements
const adminCardsGrid = document.getElementById('admin-cards-grid');
const btnCreatePost = document.getElementById('btn-create-post');
const btnCancelPost = document.getElementById('btn-cancel-post');
const adminFormContainer = document.getElementById('admin-form-container');
const postEditorForm = document.getElementById('post-editor-form');
const formHeading = document.getElementById('form-heading');

// Form Input Elements
const editPostId = document.getElementById('edit-post-id');
const postTitle = document.getElementById('post-title');
const postCategory = document.getElementById('post-category');
const newCategoryInput = document.getElementById('new-category-input');
const postAuthor = document.getElementById('post-author');
const postAuthorLocation = document.getElementById('post-author-location');
const postImageSource = document.getElementById('post-image-source');
const postImage = document.getElementById('post-image');
const postImageFile = document.getElementById('post-image-file');
const imageUploadPreviewContainer = document.getElementById('image-upload-preview-container');
const imageUploadPreview = document.getElementById('image-upload-preview');
const postTags = document.getElementById('post-tags');
const postExcerpt = document.getElementById('post-excerpt');
const postContent = document.getElementById('post-content');
const btnSavePost = document.getElementById('btn-save-post');

// Temporary memory for uploaded image
let uploadedImageBase64 = '';

// Initialize Dashboard with Passcode Protection Gate
const CORRECT_PASSCODE = "shriyanshking";

document.addEventListener('DOMContentLoaded', () => {
    const authGate = document.getElementById('auth-gate-container');
    const adminView = document.getElementById('admin-view');
    const btnLogout = document.getElementById('btn-logout');
    const authForm = document.getElementById('auth-form');
    const passcodeInput = document.getElementById('admin-passcode');
    const authErrorMsg = document.getElementById('auth-error-msg');

    function checkAuth() {
        const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
        if (isAuth) {
            authGate.style.display = 'none';
            adminView.style.display = 'block';
            btnLogout.style.display = 'inline-block';
            populateCategoryDropdown();
            renderAdminCards();
        } else {
            authGate.style.display = 'flex';
            adminView.style.display = 'none';
            btnLogout.style.display = 'none';
        }
    }

    // Auth Form submit handler
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredPasscode = passcodeInput.value;
        if (enteredPasscode === CORRECT_PASSCODE) {
            sessionStorage.setItem('admin_authenticated', 'true');
            authErrorMsg.style.display = 'none';
            passcodeInput.value = '';
            checkAuth();
        } else {
            authErrorMsg.style.display = 'block';
            // Reset shake animation
            authErrorMsg.style.animation = 'none';
            authErrorMsg.offsetHeight; /* trigger reflow */
            authErrorMsg.style.animation = '';
        }
    });

    // Logout button handler
    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('admin_authenticated');
        checkAuth();
    });

    checkAuth();
    setupAdminEventListeners();
});

// Save articles array to localStorage
function saveArticles() {
    localStorage.setItem('gethotel_articles', JSON.stringify(articles));
}

// Populate Categories Select Dropdown dynamically
function populateCategoryDropdown() {
    // Collect all unique categories
    const categoriesMap = new Map();
    categoriesMap.set('guides', 'Guides');
    categoriesMap.set('adventure', 'Adventure');
    categoriesMap.set('culinary', 'Culinary');
    categoriesMap.set('culture', 'Culture');
    
    articles.forEach(a => {
        if (a.category && a.categoryName) {
            categoriesMap.set(a.category, a.categoryName);
        }
    });
    
    postCategory.innerHTML = '';
    categoriesMap.forEach((name, val) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = name;
        postCategory.appendChild(opt);
    });
    
    const optNew = document.createElement('option');
    optNew.value = '__new__';
    optNew.textContent = '+ Create New Category';
    postCategory.appendChild(optNew);
}

// Render Table/Cards of Articles
function renderAdminCards() {
    adminCardsGrid.innerHTML = '';

    if (articles.length === 0) {
        adminCardsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-style: italic; padding: 40px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
                No blog posts available. Click "Create New Post" to publish one.
            </div>
        `;
        return;
    }

    articles.forEach((article) => {
        const card = document.createElement('div');
        card.className = 'admin-card-item';
        
        card.innerHTML = `
            <img class="admin-card-thumb" src="${article.image || 'assets/resort.png'}" alt="${escapeHTML(article.title)}" onerror="this.src='../assets/resort.png'">
            <div class="admin-card-body">
                <div>
                    <div class="admin-card-meta">
                        <span class="category-badge" style="margin-bottom: 0; padding: 3px 8px; font-size: 10px;">${escapeHTML(article.categoryName)}</span>
                        <span style="margin-left: 8px;">${escapeHTML(article.date)}</span>
                    </div>
                    <h4 class="admin-card-title">${escapeHTML(article.title)}</h4>
                    <div class="admin-card-author">
                        By <strong>${escapeHTML(article.author)}</strong>
                        ${article.authorLocation ? `<span style="display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px;">📍 ${escapeHTML(article.authorLocation)}</span>` : ''}
                    </div>
                </div>
                <div class="admin-card-actions">
                    <button class="admin-action-btn btn-edit" onclick="editPost(${article.id})">Edit</button>
                    <button class="admin-action-btn btn-delete" onclick="deletePost(${article.id})">Delete</button>
                </div>
            </div>
        `;

        adminCardsGrid.appendChild(card);
    });
}

// Compress and Resize Images to prevent LocalStorage limits
function handleImageUpload(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const max_width = 800;
            const max_height = 600;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > max_width) {
                    height *= max_width / width;
                    width = max_width;
                }
            } else {
                if (height > max_height) {
                    width *= max_height / height;
                    height = max_height;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Output small visual JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            uploadedImageBase64 = dataUrl;
            imageUploadPreview.src = dataUrl;
            imageUploadPreviewContainer.style.display = 'block';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Setup Event Listeners
function setupAdminEventListeners() {
    // Scroll event listener for floating header
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        if (window.scrollY > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Toggle Create Post Form
    btnCreatePost.addEventListener('click', () => {
        resetForm();
        formHeading.textContent = "Create New Blog Post";
        btnSavePost.textContent = "Publish Post";
        adminFormContainer.style.display = 'block';
        
        // Scroll to editor form
        adminFormContainer.scrollIntoView({ behavior: 'smooth' });
    });

    // Cancel editing/creating
    btnCancelPost.addEventListener('click', () => {
        resetForm();
        adminFormContainer.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Handle Category change toggle
    postCategory.addEventListener('change', () => {
        if (postCategory.value === '__new__') {
            newCategoryInput.style.display = 'block';
            newCategoryInput.required = true;
            newCategoryInput.focus();
        } else {
            newCategoryInput.style.display = 'none';
            newCategoryInput.required = false;
        }
    });

    // Handle Image Source toggle
    postImageSource.addEventListener('change', () => {
        if (postImageSource.value === 'upload') {
            postImage.style.display = 'none';
            postImageFile.style.display = 'block';
            if (uploadedImageBase64) {
                imageUploadPreviewContainer.style.display = 'block';
            }
        } else {
            postImage.style.display = 'block';
            postImageFile.style.display = 'none';
            imageUploadPreviewContainer.style.display = 'none';
        }
    });

    // Handle File upload
    postImageFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    });

    // Form Submit handling (Create or Update)
    postEditorForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const idVal = editPostId.value;
        const titleVal = postTitle.value.trim();
        const authorVal = postAuthor.value.trim();
        const locationVal = postAuthorLocation.value.trim();
        const excerptVal = postExcerpt.value.trim();
        const contentVal = postContent.value.trim();
        
        // Compute Category Name and Category ID
        let categoryVal = '';
        let categoryNameVal = '';
        if (postCategory.value === '__new__') {
            const rawCategory = newCategoryInput.value.trim();
            categoryNameVal = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
            categoryVal = categoryNameVal.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!categoryVal) {
                alert('Please enter a valid category name.');
                return;
            }
        } else {
            categoryVal = postCategory.value;
            categoryNameVal = postCategory.options[postCategory.selectedIndex].text;
        }

        // Determine cover image URL
        let imageVal = '';
        if (postImageSource.value === 'upload') {
            if (!uploadedImageBase64) {
                alert('Please upload a cover image file or choose a preset.');
                return;
            }
            imageVal = uploadedImageBase64;
        } else {
            imageVal = postImage.value;
        }
        
        // Handle tags
        const tagsVal = postTags.value.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        // Compute reading time (approx 200 words per min)
        const wordCount = contentVal.split(/\s+/).filter(w => w.length > 0).length;
        const readTimeVal = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

        // Compute initials
        const authorInitialsVal = authorVal.split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

        if (idVal) {
            // Update mode
            const targetId = parseInt(idVal);
            const articleIndex = articles.findIndex(a => a.id === targetId);
            
            if (articleIndex !== -1) {
                // Merge changes
                articles[articleIndex] = {
                    ...articles[articleIndex],
                    title: titleVal,
                    excerpt: excerptVal,
                    category: categoryVal,
                    categoryName: categoryNameVal,
                    image: imageVal,
                    author: authorVal,
                    authorInitials: authorInitialsVal,
                    authorLocation: locationVal,
                    readTime: readTimeVal,
                    tags: tagsVal,
                    content: contentVal
                };
            }
        } else {
            // Create mode
            // Generate auto-incrementing ID
            const newId = articles.length > 0 ? Math.max(...articles.map(a => a.id)) + 1 : 1;
            
            // Format current date
            const dateOptions = { year: 'numeric', month: 'long', day: '2-digit' };
            const formattedDate = new Date().toLocaleDateString('en-US', dateOptions);

            const newArticle = {
                id: newId,
                title: titleVal,
                excerpt: excerptVal,
                category: categoryVal,
                categoryName: categoryNameVal,
                image: imageVal,
                author: authorVal,
                authorInitials: authorInitialsVal,
                authorLocation: locationVal,
                date: formattedDate,
                readTime: readTimeVal,
                tags: tagsVal,
                featured: false, // Defaulting false, first element will naturally resolve on homepage
                content: contentVal,
                comments: []
            };

            articles.unshift(newArticle); // Prepend new article to top of the list
        }

        saveArticles();
        renderAdminCards();
        resetForm();
        adminFormContainer.style.display = 'none';

        // Scroll back to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Reset Form Inputs
function resetForm() {
    editPostId.value = '';
    postTitle.value = '';
    postCategory.selectedIndex = 0;
    newCategoryInput.value = '';
    newCategoryInput.style.display = 'none';
    newCategoryInput.required = false;
    postAuthor.value = '';
    postAuthorLocation.value = '';
    postImageSource.selectedIndex = 0;
    postImage.style.display = 'block';
    postImage.selectedIndex = 0;
    postImageFile.value = '';
    postImageFile.style.display = 'none';
    imageUploadPreviewContainer.style.display = 'none';
    imageUploadPreview.src = '';
    uploadedImageBase64 = '';
    postTags.value = '';
    postExcerpt.value = '';
    postContent.value = '';
    
    populateCategoryDropdown();
}

// Edit Post triggered from table row
window.editPost = function(id) {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    formHeading.textContent = "Edit Blog Post";
    btnSavePost.textContent = "Save Changes";

    editPostId.value = article.id;
    postTitle.value = article.title;
    
    populateCategoryDropdown();
    postCategory.value = article.category;
    newCategoryInput.style.display = 'none';
    newCategoryInput.required = false;

    postAuthor.value = article.author;
    postAuthorLocation.value = article.authorLocation || '';
    
    // Check cover image source type
    if (article.image && article.image.startsWith('data:')) {
        postImageSource.value = 'upload';
        postImage.style.display = 'none';
        postImageFile.style.display = 'block';
        imageUploadPreview.src = article.image;
        imageUploadPreviewContainer.style.display = 'block';
        uploadedImageBase64 = article.image;
    } else {
        postImageSource.value = 'preset';
        postImage.style.display = 'block';
        postImage.value = article.image || 'assets/resort.png';
        postImageFile.style.display = 'none';
        imageUploadPreviewContainer.style.display = 'none';
        imageUploadPreview.src = '';
        uploadedImageBase64 = '';
    }

    postTags.value = article.tags.join(', ');
    postExcerpt.value = article.excerpt;
    postContent.value = article.content;

    adminFormContainer.style.display = 'block';
    adminFormContainer.scrollIntoView({ behavior: 'smooth' });
};

// Delete Post triggered from table row
window.deletePost = function(id) {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    const confirmed = confirm(`Are you sure you want to delete "${article.title}"?`);
    if (confirmed) {
        articles = articles.filter(a => a.id !== id);
        saveArticles();
        renderAdminCards();
        
        // Hide editor if we were editing the deleted post
        if (editPostId.value && parseInt(editPostId.value) === id) {
            resetForm();
            adminFormContainer.style.display = 'none';
        }
    }
};

// Simple HTML escaping helper
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

