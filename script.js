document.addEventListener('DOMContentLoaded', () => {
    // STATE
    let products = [];
    let filteredProducts = [];
    let sliderInterval = null;
    let currentSlideIndex = 0;

    // DOM ELEMENTS
    const loader = document.getElementById('loader');
    const navLinks = document.getElementById('nav-links');
    const content = document.getElementById('content');

    // --- UTILITY FUNCTIONS ---
    const setCookie = (name, value, days) => {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    };

    const getCookie = (name) => {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    };

    const showToast = (text, options = { type: 'info', timeout: 2500 }) => {
        const toast = document.getElementById('toast');
        toast.textContent = text;
        const colors = {
            error: 'linear-gradient(45deg, var(--danger), #ff6b6b)',
            success: 'linear-gradient(45deg, var(--success), #3dd17a)',
            info: 'linear-gradient(45deg, var(--accent), var(--accent-2))'
        };
        toast.style.background = colors[options.type] || colors.info;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), options.timeout);
    };

    // --- DATA HANDLING (localStorage) ---
    const saveUser = (email, name, password) => {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        users[email] = { name, password };
        localStorage.setItem('users', JSON.stringify(users));
    };
    const getUsers = () => JSON.parse(localStorage.getItem('users') || '{}');
    const saveCart = (cart) => localStorage.setItem('cart', JSON.stringify(cart));
    const getCart = () => JSON.parse(localStorage.getItem('cart') || '[]');

    // --- NAVIGATION ---
    const navigate = (page, skipHashUpdate = false) => {
        const loggedInUser = getCookie('loggedInUser');
        const restrictedPages = ['categories', 'cart', 'contacts', 'order-confirmation'];

        if (restrictedPages.includes(page.split('/')[0]) && !loggedInUser) {
            navigate('login');
            showToast('Please log in to continue.', { type: 'error' });
            return;
        }

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        if (page.startsWith('product/')) {
            const productId = page.split('/')[1];
            document.getElementById('product-details-page')?.classList.add('active');
            renderProductDetails(productId);
        } else {
            const pageElement = document.getElementById(`${page}-page`);
            if (pageElement) {
                pageElement.classList.add('active');
                // Page-specific render functions
                if (page === 'categories') applyFilters();
                if (page === 'home') {
                    renderMiniFeature();
                    renderCategoryCards();
                    // Hide hero buttons if logged in
                    const heroButtonGroup = document.querySelector('.hero-card .button-group');
                    if (heroButtonGroup) {
                        heroButtonGroup.style.display = loggedInUser ? 'none' : 'flex';
                    }
                }
                if (page === 'cart') renderCart();
            }
        }

        if (!skipHashUpdate) {
            window.location.hash = page;
        }
        updateNavbar();
        window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', () => {
        const page = window.location.hash.replace('#', '') || 'home';
        navigate(page, true);
    });

    // --- API & DATA FETCHING ---
    const fetchProducts = async () => {
        loader.style.display = 'flex';
        try {
            const response = await fetch('https://dummyjson.com/products?limit=100');
            const data = await response.json();
            products = data.products || [];
            filteredProducts = [...products];
        } catch (error) {
            console.error("Failed to fetch products:", error);
            showToast('Could not load products. Please check your connection.', { type: 'error' });
        } finally {
            loader.style.display = 'none';
            // Initial render after fetching
            populateCategorySelect();
            applyFilters();
            renderMiniFeature();
            renderCategoryCards();
        }
    };

    // --- RENDERING FUNCTIONS ---
    const updateNavbar = () => {
        if (!navLinks) return;
        const loggedInUser = getCookie('loggedInUser');
        if (loggedInUser) {
            const users = getUsers();
            const userName = users[loggedInUser]?.name || 'User';
            const cart = getCart();
            const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
            navLinks.innerHTML = `
                <a href="#home" data-page="home">Home</a>
                <a href="#categories" data-page="categories">Products</a>
                <a href="#contacts" data-page="contacts">Contact</a>
                <a href="#cart" data-page="cart">Cart <span class="cart-count">${cartCount}</span></a>
                <span>Hi, ${userName.split(' ')[0]}</span>
                <span id="logout" data-page="logout" style="cursor:pointer;">Logout</span>
            `;
        } else {
            navLinks.innerHTML = `
                <a href="#home" data-page="home">Home</a>
                <a href="#register" data-page="register">Register</a>
                <a href="#login" data-page="login">Login</a>
            `;
        }
    };

    const renderMiniFeature = () => {
        const el = document.getElementById('mini-feature');
        if (!el || products.length === 0) return;
        const p = products[Math.floor(Math.random() * products.length)];
        el.innerHTML = `<div style="display:flex;gap:12px;align-items:center">
            <img src="${p.thumbnail}" style="width:64px;height:54px;object-fit:cover;border-radius:8px" alt="Featured product: ${p.title}">
            <div><div style="font-weight:700">${p.title}</div><div style="color:var(--muted)">$${p.price}</div></div>
        </div>`;
    };

    const renderCategoryCards = () => {
        const grid = document.getElementById('category-grid');
        if (!grid || products.length === 0) return;
        const categories = [...new Set(products.map(p => p.category))].sort().slice(0, 6); // Limit to 6 categories
        grid.innerHTML = categories.map(category => {
            const sampleProduct = products.find(p => p.category === category);
            return `
                <div class="category-card" data-category="${category}">
                    <img src="${sampleProduct.thumbnail}" alt="${category} category image">
                    <h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                </div>
            `;
        }).join('');
    };

    const populateCategorySelect = () => {
        const select = document.getElementById('category-select');
        if (!select) return;
        const categories = [...new Set(products.map(p => p.category))].sort();
        select.innerHTML = '<option value="">All</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');
    };

    const renderSlider = () => {
        const el = document.getElementById('slider');
        if (!el) return;
        clearInterval(sliderInterval);

        if (filteredProducts.length === 0) {
            el.innerHTML = '<p style="text-align:center;color:var(--muted);">No featured products available.</p>';
            return;
        }

        const buildSlide = () => {
            const p = filteredProducts[currentSlideIndex];
            if (!p) return;
            el.innerHTML = `<div class="slide-inner">
                <img src="${p.thumbnail}" alt="${p.title}">
                <div class="slide-meta">
                    <h3>${p.title}</h3>
                    <p>${p.description.slice(0, 120)}...</p>
                    <div style="margin-top:8px;font-weight:800;color:var(--accent); font-size: 1.2rem;">$${p.price}</div>
                    <div style="margin-top:12px; display:flex; gap: 8px;">
                        <button class="small-btn see-more" data-id="${p.id}">Details</button>
                        <button class="small-btn add-to-cart" data-id="${p.id}">Add to Cart</button>
                    </div>
                </div>
            </div>`;
        };

        const nextSlide = () => {
            currentSlideIndex = (currentSlideIndex + 1) % filteredProducts.length;
            buildSlide();
        };

        buildSlide();
        sliderInterval = setInterval(nextSlide, 2500);
    };

    const renderProductCards = () => {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        if (filteredProducts.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;color:var(--muted);">No products match your filters.</p>';
            return;
        }
        grid.innerHTML = filteredProducts.map(p => `
            <div class="product-card">
                <img src="${p.thumbnail}" alt="${p.title}">
                <h3>${p.title}</h3>
                <div class="price">$${p.price}</div>
                <div class="card-actions">
                    <button class="small-btn see-more" data-id="${p.id}">See</button>
                    <button class="small-btn add-to-cart" data-id="${p.id}">Add</button>
                </div>
            </div>
        `).join('');
    };

    const renderProductDetails = (id) => {
        const product = products.find(p => String(p.id) === String(id));
        const container = document.getElementById('product-details-content');
        if (!container) return;
        if (!product) {
            showToast('Product not found', { type: 'error' });
            navigate('categories');
            return;
        }
        container.innerHTML = `
            <div class="gallery"><img src="${product.images[0] || product.thumbnail}" alt="${product.title}"></div>
            <div class="details">
                <h2>${product.title}</h2>
                <div class="meta">Category: ${product.category} • Rating: ${product.rating} ★</div>
                <p>${product.description}</p>
                <div class="price">$${product.price}</div>
                <div class="button-group">
                    <button class="btn btn-primary" data-id="${product.id}" id="pd-add-to-cart">Add to Cart</button>
                    <button class="btn btn-ghost" data-page="categories">Back to Products</button>
                </div>
            </div>`;
    };

    const renderCart = () => {
        const holder = document.getElementById('cart-content');
        const totalEl = document.getElementById('cart-total');
        const actionsEl = document.getElementById('cart-actions');
        if (!holder || !totalEl || !actionsEl) return;

        const cart = getCart();
        if (cart.length === 0) {
            holder.innerHTML = '<p style="text-align:center;color:var(--muted);padding:2rem;">Your cart is empty.</p>';
            totalEl.textContent = 'Total: $0.00';
            actionsEl.style.display = 'none';
            return;
        }

        actionsEl.style.display = 'flex';
        let total = 0;
        holder.innerHTML = cart.map(cartItem => {
            const product = products.find(p => p.id === cartItem.id);
            if (!product) return '';
            total += product.price * cartItem.quantity;
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                       <img src="${product.thumbnail}" alt="${product.title}">
                       <div>
                           <div style="font-weight:700">${product.title}</div>
                           <div style="color:var(--muted)">Price: $${product.price}</div>
                       </div>
                    </div>
                    <div class="quantity-controls">
                        <button class="qbtn" data-id="${product.id}" data-op="dec">-</button>
                        <span>${cartItem.quantity}</span>
                        <button class="qbtn" data-id="${product.id}" data-op="inc">+</button>
                    </div>
                    <div style="font-weight:800; min-width: 80px; text-align:right;">$${(product.price * cartItem.quantity).toFixed(2)}</div>
                </div>`;
        }).join('');
        totalEl.textContent = `Total: $${total.toFixed(2)}`;
    };

    // --- FILTERS & SORTING ---
    const applyFilters = () => {
        const search = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
        const category = document.getElementById('category-select')?.value || '';
        const minPrice = parseFloat(document.getElementById('price-min')?.value) || 0;
        const maxPrice = parseFloat(document.getElementById('price-max')?.value) || Infinity;
        const minRating = parseFloat(document.getElementById('rating-select')?.value) || 0;
        const sort = document.getElementById('sort-select')?.value || 'default';

        filteredProducts = products.filter(p => {
            return (
                p.title.toLowerCase().includes(search) &&
                (category === '' || p.category === category) &&
                p.price >= minPrice &&
                p.price <= maxPrice &&
                p.rating >= minRating
            );
        });

        if (sort === 'price-asc') filteredProducts.sort((a, b) => a.price - b.price);
        else if (sort === 'price-desc') filteredProducts.sort((a, b) => b.price - a.price);
        else if (sort === 'rating-desc') filteredProducts.sort((a, b) => b.rating - a.rating);

        renderProductCards();
        renderSlider();
    };

    const clearFilters = () => {
        document.querySelectorAll('.filters input, .filters select').forEach(el => {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        });
        applyFilters();
    };

    // --- CART LOGIC ---
    const addToCart = (productId) => {
        productId = Number(productId);
        if (!getCookie('loggedInUser')) {
            navigate('login');
            showToast('Please log in to add items.', { type: 'error' });
            return;
        }
        const product = products.find(p => p.id === productId);
        if (!product) {
            showToast('Product not available.', { type: 'error' });
            return;
        }

        const cart = getCart();
        const cartItem = cart.find(item => item.id === productId);
        if (cartItem) {
            cartItem.quantity++;
        } else {
            cart.push({ id: productId, quantity: 1 });
        }
        saveCart(cart);
        updateNavbar();
        showToast(`${product.title} added to cart!`, { type: 'success' });
        if (document.getElementById('cart-page').classList.contains('active')) {
            renderCart();
        }
    };

    const updateCartQuantity = (productId, change) => {
        productId = Number(productId);
        let cart = getCart();
        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex > -1) {
            cart[itemIndex].quantity += change;
            if (cart[itemIndex].quantity <= 0) {
                cart.splice(itemIndex, 1);
            }
        }
        saveCart(cart);
        renderCart();
        updateNavbar();
    };

    // --- AUTHENTICATION ---
    const handleRegister = () => {
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm-password').value;

        // Simple validation
        if (!name || !email || password.length < 8 || password !== confirm) {
            showToast('Please fill all fields correctly.', { type: 'error' });
            return;
        }
        if (getUsers()[email]) {
            showToast('Email already in use.', { type: 'error' });
            return;
        }

        saveUser(email, name, password);
        setCookie('loggedInUser', email, 7);
        showToast(`Welcome, ${name}!`, { type: 'success' });
        navigate('categories');
    };

    const handleLogin = () => {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        if (!email || !password) {
            errorEl.textContent = 'All fields are required.';
            errorEl.style.display = 'block';
            return;
        }
        const users = getUsers();
        if (!users[email] || users[email].password !== password) {
            errorEl.textContent = 'Invalid credentials.';
            errorEl.style.display = 'block';
            return;
        }

        errorEl.style.display = 'none';
        setCookie('loggedInUser', email, 7);
        showToast('Welcome back!', { type: 'success' });
        navigate('categories');
    };

    const handleLogout = () => {
        setCookie('loggedInUser', '', -1);
        showToast('You have been logged out.', { type: 'info' });
        navigate('home');
    };

    // --- EVENT LISTENERS ---
    const initializeEventListeners = () => {
        // Global click handler for delegated events
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            const pageTarget = target.closest('[data-page]');
            const addToCartBtn = target.closest('.add-to-cart, #pd-add-to-cart');
            const seeMoreBtn = target.closest('.see-more');
            const quantityBtn = target.closest('.qbtn');
            const categoryCard = target.closest('.category-card');

            if (pageTarget) {
                e.preventDefault();
                const page = pageTarget.getAttribute('data-page');
                if (page === 'logout') handleLogout();
                else navigate(page);
            }
            if (addToCartBtn) addToCart(addToCartBtn.dataset.id);
            if (seeMoreBtn) navigate(`product/${seeMoreBtn.dataset.id}`);
            if (quantityBtn) {
                const id = quantityBtn.dataset.id;
                const op = quantityBtn.dataset.op;
                updateCartQuantity(id, op === 'inc' ? 1 : -1);
            }
            if (categoryCard) {
                const category = categoryCard.dataset.category;
                navigate('categories');
                const select = document.getElementById('category-select');
                if (select) {
                    select.value = category;
                    applyFilters();
                }
            }
        });

        // Form submissions
        document.getElementById('register-form')?.addEventListener('submit', (e) => { e.preventDefault(); handleRegister(); });
        document.getElementById('login-form')?.addEventListener('submit', (e) => { e.preventDefault(); handleLogin(); });

        // Filter events
        document.getElementById('clear-filters')?.addEventListener('click', clearFilters);
        ['search-input', 'price-min', 'price-max'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', applyFilters);
        });
        ['category-select', 'rating-select', 'sort-select'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', applyFilters);
        });

        // Buy Now
        document.getElementById('buy-now-button')?.addEventListener('click', () => {
            if (getCart().length === 0) {
                showToast('Your cart is empty.', { type: 'error' });
                return;
            }
            const orderId = 'ORD' + Date.now().toString().slice(-6);
            saveCart([]);
            navigate('order-confirmation');
            document.getElementById('order-msg').textContent = `Order ${orderId} confirmed. We will email you the receipt.`;
            showToast('Order placed successfully!', { type: 'success' });
        });

        // Scroll to top
        const scrollTopBtn = document.getElementById('scroll-to-top');
        window.addEventListener('scroll', () => {
            scrollTopBtn.classList.toggle('show', window.scrollY > 300);
        });
        scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    };

    // --- INITIALIZATION ---
    const init = async () => {
        await fetchProducts();
        initializeEventListeners();
        const initialPage = window.location.hash.replace('#', '') || 'home';
        navigate(initialPage, true);
    };

    init();
});