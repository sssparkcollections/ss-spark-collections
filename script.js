import { supabase } from "./supabase-client.js";

/* =========================================================
   DYNAMIC BANNER SLIDER
   Data source: public.banners
========================================================= */

let currentSlide = 0;
let bannerTimer = null;
let banners = [];

const heroSlider = document.getElementById("heroSlider");
const bannerSlides = document.getElementById("bannerSlides");
const bannerDots = document.getElementById("bannerDots");
const previousBtn = document.getElementById("bannerPreviousBtn");
const nextBtn = document.getElementById("bannerNextBtn");


/* =========================================================
   LOAD BANNERS FROM SUPABASE
========================================================= */

async function loadBanners() {

    if (!heroSlider || !bannerSlides || !bannerDots) {
        return;
    }

    const { data, error } = await supabase
        .from("banners")
        .select(`
            id,
            title,
            subtitle,
            image_url,
            button_text,
            button_link,
            is_active,
            display_order,
            start_date,
            end_date
        `)
        .eq("is_active", true)
        .order("display_order", {
            ascending: true
        });

    if (error) {
        console.error("Error loading banners:", error);
        heroSlider.style.display = "none";
        return;
    }


    /* =====================================================
       DATE FILTER
       Show only banners currently within their date range
    ===================================================== */

    const now = new Date();

    banners = (data || []).filter(banner => {

        const startDate = banner.start_date
            ? new Date(banner.start_date)
            : null;

        const endDate = banner.end_date
            ? new Date(banner.end_date)
            : null;


        if (startDate && now < startDate) {
            return false;
        }

        if (endDate && now > endDate) {
            return false;
        }

        return true;
    });


    /* No active banners */

    if (banners.length === 0) {
        heroSlider.style.display = "none";
        return;
    }


    heroSlider.style.display = "";
    currentSlide = 0;

    renderBanners();
    startBannerAutoPlay();
}


/* =========================================================
   RENDER BANNERS
========================================================= */

function renderBanners() {

    bannerSlides.innerHTML = "";
    bannerDots.innerHTML = "";


    banners.forEach((banner, index) => {

        /* -----------------------------
           Slide
        ----------------------------- */

        const slide = document.createElement("div");

        slide.className =
            index === 0
                ? "slide active"
                : "slide";


        /* -----------------------------
           Image
        ----------------------------- */

        const image = document.createElement("img");

        image.src = banner.image_url;
        image.alt =
            banner.title ||
            "SS Spark Collections";


        /* -----------------------------
           Content
        ----------------------------- */

        const content = document.createElement("div");

        content.className = "banner-content";


        if (banner.title) {

            const title = document.createElement("h2");

            title.textContent = banner.title;

            content.appendChild(title);
        }


        if (banner.subtitle) {

            const subtitle = document.createElement("p");

            subtitle.textContent = banner.subtitle;

            content.appendChild(subtitle);
        }


        /* -----------------------------
           Button
        ----------------------------- */

        if (banner.button_text && banner.button_link) {

            const button = document.createElement("a");

            button.className = "banner-button";

            button.textContent = banner.button_text;

            button.href = banner.button_link;

            content.appendChild(button);
        }


        slide.appendChild(image);
        slide.appendChild(content);

        bannerSlides.appendChild(slide);


        /* -----------------------------
           Dot
        ----------------------------- */

        const dot = document.createElement("button");

        dot.type = "button";

        dot.className =
            index === 0
                ? "dot active"
                : "dot";

        dot.setAttribute(
            "aria-label",
            `Go to banner ${index + 1}`
        );

        dot.addEventListener("click", () => {

            showBanner(index);
            restartBannerAutoPlay();

        });

        bannerDots.appendChild(dot);
    });


    attachBannerButtons();

    showBanner(0);
}


/* =========================================================
   SHOW BANNER
========================================================= */

function showBanner(index) {

    if (!banners.length) {
        return;
    }


    if (index >= banners.length) {
        currentSlide = 0;
    }

    else if (index < 0) {
        currentSlide = banners.length - 1;
    }

    else {
        currentSlide = index;
    }


    const slides =
        bannerSlides.querySelectorAll(".slide");

    const dots =
        bannerDots.querySelectorAll(".dot");


    slides.forEach(slide => {
        slide.classList.remove("active");
    });


    dots.forEach(dot => {
        dot.classList.remove("active");
    });


    if (slides[currentSlide]) {
        slides[currentSlide].classList.add("active");
    }


    if (dots[currentSlide]) {
        dots[currentSlide].classList.add("active");
    }
}


/* =========================================================
   NEXT / PREVIOUS
========================================================= */

function nextBanner() {

    if (!banners.length) {
        return;
    }

    showBanner(currentSlide + 1);

    restartBannerAutoPlay();
}


function previousBanner() {

    if (!banners.length) {
        return;
    }

    showBanner(currentSlide - 1);

    restartBannerAutoPlay();
}


/* =========================================================
   BUTTON EVENTS
========================================================= */

function attachBannerButtons() {

    if (previousBtn) {

        previousBtn.addEventListener(
            "click",
            previousBanner
        );
    }


    if (nextBtn) {

        nextBtn.addEventListener(
            "click",
            nextBanner
        );
    }
}


/* =========================================================
   AUTO PLAY
========================================================= */

function startBannerAutoPlay() {

    stopBannerAutoPlay();

    if (banners.length <= 1) {
        return;
    }


    bannerTimer = setInterval(() => {

        showBanner(currentSlide + 1);

    }, 5000);
}


function stopBannerAutoPlay() {

    if (bannerTimer) {

        clearInterval(bannerTimer);

        bannerTimer = null;
    }
}


function restartBannerAutoPlay() {

    startBannerAutoPlay();
}


/* =========================================================
   START
========================================================= */

loadBanners();

/* =========================================================
   PARAMETER-DRIVEN HOMEPAGE ALERT
   Optional only: if no active parameter exists, nothing changes.
   parameter_group = HOME_PAGE
   parameter_code  = ALERT_MESSAGE
   parameter_value = message
========================================================= */
(function initHomepageAlert(){
    const alert = document.getElementById("homeAlert");
    const message = document.getElementById("homeAlertMessage");
    const close = document.getElementById("homeAlertClose");
    if (!alert || !message) return;

    const dismissedKey = "ss_spark_home_alert_dismissed";

    close?.addEventListener("click", () => {
        alert.hidden = true;
        try {
            sessionStorage.setItem(dismissedKey, message.textContent.trim());
        } catch {}
    });

    (async function loadHomepageAlert(){
        try {
            const { data, error } = await supabase
                .from("parameter_values")
                .select("parameter_value,parameter_name,description,display_order")
                .eq("parameter_group", "HOME_PAGE")
                .eq("parameter_code", "ALERT_MESSAGE")
                .eq("is_active", true)
                .order("display_order", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            const text = String(
                data?.parameter_value ||
                data?.parameter_name ||
                data?.description ||
                ""
            ).trim();

            if (!text) return;

            let dismissed = false;
            try {
                dismissed = sessionStorage.getItem(dismissedKey) === text;
            } catch {}

            if (!dismissed) {
                message.textContent = text;
                alert.hidden = false;
            }
        } catch (error) {
            /* Enhancement-only: never interrupt the existing homepage. */
            console.error("Homepage alert parameter error:", error);
        }
    })();
})();


async function updateAuthUI() {

    const authArea = document.getElementById("authArea");

    if (!authArea) return;

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
    authArea.innerHTML = `
        <a href="login.html" class="login-btn">
            Login
        </a>

        <a href="signup.html" class="signup-btn">
            Create Account
        </a>
    `;

    return;
}

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

    authArea.innerHTML = `
    <div class="profile-dropdown">

        <button class="profile-trigger" id="profileTrigger">
            <span class="profile-avatar">✦</span>
            <span>Hi, ${profile?.full_name || "Sparkle Lover"}</span>
            <span class="profile-arrow">⌄</span>
        </button>

        <div class="profile-menu" id="profileMenu">

            <div class="profile-menu-header">
                <div class="profile-menu-avatar">✦</div>
                <div>
                    <strong>${profile?.full_name || "Sparkle Lover"}</strong>
                    <small>${user.email}</small>
                </div>
            </div>

            <div class="profile-menu-divider"></div>

            <a href="wishlist.html" class="profile-menu-item">
                <span>♡</span>
                <span>Wishlist</span>
            </a>

            <a href="order-lists.html" class="profile-menu-item">
                <span>♧</span>
                <span>My Orders</span>
            </a>

            ${profile?.role === "admin" ? `
<a href="admin.html" class="profile-menu-item">
    <span>⚙</span>
    <span>Admin Panel</span>
</a>
` : ""}

            <div class="profile-menu-divider"></div>

            <button id="logoutBtn" class="profile-menu-logout">
                <span>↪</span>
                <span>Logout</span>
            </button>

        </div>

    </div>
`;

const profileTrigger = document.getElementById("profileTrigger");
const profileMenu = document.getElementById("profileMenu");

profileTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    profileMenu.classList.toggle("show");
});

document.addEventListener("click", (event) => {
    if (!profileMenu.contains(event.target) &&
        !profileTrigger.contains(event.target)) {
        profileMenu.classList.remove("show");
    }
});

    document
        .getElementById("logoutBtn")
        .addEventListener("click", async () => {

            await supabase.auth.signOut();

            window.location.reload();

        });
}

updateAuthUI();

/* Existing header search control */
const homepageSearchButton = document.querySelector(".header-actions .icon-btn");
if (homepageSearchButton) {
    homepageSearchButton.addEventListener("click", () => {
        window.location.href = "search.html";
    });
}


/* =========================================================
   SHOP BY CATEGORY
   Data source: public.categories
========================================================= */

const homeCategories =
    document.getElementById("homeCategories");

const categoryPrevBtn =
    document.getElementById("categoryPrevBtn");

const categoryNextBtn =
    document.getElementById("categoryNextBtn");

const categoryDots =
    document.getElementById("categoryDots");

const categoriesSection =
    document.querySelector(".categories");


/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function loadHomeCategories() {

    if (!homeCategories) {
        return;
    }


    const { data, error } = await supabase

        .from("categories")

        .select(`
            id,
            name,
            slug,
            description,
            image_url,
            is_active,
            display_order
        `)

        .eq("is_active", true)

        .order("display_order", {
            ascending: true
        });


    if (error) {

        console.error(
            "Error loading home categories:",
            error
        );

        if (categoriesSection) {
            categoriesSection.style.display = "none";
        }

        return;
    }


    const categories = data || [];


    if (!categories.length) {

        if (categoriesSection) {
            categoriesSection.style.display = "none";
        }

        return;
    }


    renderHomeCategories(categories);

}


/* =========================================================
   RENDER CATEGORY CARDS
========================================================= */

function renderHomeCategories(categories) {

    homeCategories.innerHTML = "";

    categoryDots.innerHTML = "";


    categories.forEach((category, index) => {

        /* -----------------------------------------
           CARD
        ----------------------------------------- */

        const card =
            document.createElement("article");

        card.className =
            "category-card";


        /* -----------------------------------------
           IMAGE
        ----------------------------------------- */

        const imageWrapper =
            document.createElement("div");

        imageWrapper.className =
            "category-image";


        if (category.image_url) {

            const image =
                document.createElement("img");

            image.src =
                category.image_url;

            image.alt =
                category.name;

            image.loading =
                "lazy";


            image.onerror = () => {

                image.style.display =
                    "none";

            };


            imageWrapper.appendChild(image);

        }


        /* -----------------------------------------
           IMAGE OVERLAY
        ----------------------------------------- */

        const overlay =
            document.createElement("div");

        overlay.className =
            "category-image-overlay";


        const explore =
            document.createElement("span");

        explore.className =
            "category-explore";

        explore.textContent =
            "Explore →";


        overlay.appendChild(explore);

        imageWrapper.appendChild(overlay);


        /* -----------------------------------------
           CONTENT
        ----------------------------------------- */

        const content =
            document.createElement("div");

        content.className =
            "category-content";


        const name =
            document.createElement("h3");

        name.textContent =
            category.name;


        content.appendChild(name);


        if (category.description) {

            const description =
                document.createElement("p");

            description.textContent =
                category.description;

            content.appendChild(
                description
            );

        }


        /* -----------------------------------------
           CARD DATA
        ----------------------------------------- */

        card.dataset.categoryId =
            category.id;

        card.dataset.categorySlug =
            category.slug;


        /* -----------------------------------------
           CARD CLICK
        ----------------------------------------- */

        card.addEventListener(
            "click",
            () => {

                window.location.href =
                    `shop.html?category=${encodeURIComponent(category.slug)}`;

            }
        );


        card.appendChild(imageWrapper);

        card.appendChild(content);

        homeCategories.appendChild(card);


        /* -----------------------------------------
           DOT
        ----------------------------------------- */

        const dot =
            document.createElement("button");

        dot.type =
            "button";

        dot.className =
            "category-dot";

        dot.setAttribute(
            "aria-label",
            `Go to category ${index + 1}`
        );


        dot.addEventListener(
            "click",
            () => {

                scrollToCategory(index);

            }
        );


        categoryDots.appendChild(dot);

    });


    updateCategoryControls();

}


/* =========================================================
   CATEGORY SCROLL
========================================================= */

function scrollToCategory(index) {

    const cards =
        homeCategories.querySelectorAll(
            ".category-card"
        );


    if (!cards[index]) {
        return;
    }


    cards[index].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start"
    });

}


/* =========================================================
   PREVIOUS
========================================================= */

if (categoryPrevBtn) {

    categoryPrevBtn.addEventListener(
        "click",
        () => {

            const amount =
                homeCategories.clientWidth * 0.82;


            homeCategories.scrollBy({
                left: -amount,
                behavior: "smooth"
            });

        }
    );

}


/* =========================================================
   NEXT
========================================================= */

if (categoryNextBtn) {

    categoryNextBtn.addEventListener(
        "click",
        () => {

            const amount =
                homeCategories.clientWidth * 0.82;


            homeCategories.scrollBy({
                left: amount,
                behavior: "smooth"
            });

        }
    );

}


/* =========================================================
   UPDATE ARROWS + DOTS
========================================================= */

function updateCategoryControls() {

    if (!homeCategories) {
        return;
    }


    const maxScroll =
        homeCategories.scrollWidth -
        homeCategories.clientWidth;


    const currentScroll =
        homeCategories.scrollLeft;


    if (categoryPrevBtn) {

        categoryPrevBtn.disabled =
            currentScroll <= 5;

    }


    if (categoryNextBtn) {

        categoryNextBtn.disabled =
            currentScroll >= maxScroll - 5;

    }


    updateCategoryDots();

}


/* =========================================================
   ACTIVE DOT
========================================================= */

function updateCategoryDots() {

    const dots =
        categoryDots.querySelectorAll(
            ".category-dot"
        );

    const cards =
        homeCategories.querySelectorAll(
            ".category-card"
        );


    if (!cards.length) {
        return;
    }


    let closestIndex = 0;

    let smallestDistance =
        Infinity;


    cards.forEach((card, index) => {

        const distance =
            Math.abs(
                card.offsetLeft -
                homeCategories.scrollLeft
            );


        if (distance < smallestDistance) {

            smallestDistance =
                distance;

            closestIndex =
                index;

        }

    });


    dots.forEach(dot => {

        dot.classList.remove("active");

    });


    if (dots[closestIndex]) {

        dots[closestIndex]
            .classList.add("active");

    }

}


/* =========================================================
   SCROLL EVENT
========================================================= */

if (homeCategories) {

    homeCategories.addEventListener(
        "scroll",
        updateCategoryControls,
        {
            passive: true
        }
    );

}


/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(
    "resize",
    updateCategoryControls
);


/* =========================================================
   INITIAL LOAD
========================================================= */

loadHomeCategories();

/* =========================================================
   HOMEPAGE PRODUCT COLLECTIONS + CUSTOMER VIEWS
   Uses the same product/image/cart model as product-details.html.
========================================================= */

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
}

function money(value) {
    const n = Number(value);
    return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "";
}

function getDiscount(product) {
    const oldPrice = Number(product.compare_at_price);
    const price = Number(product.price);
    if (!Number.isFinite(oldPrice) || !Number.isFinite(price) || oldPrice <= price || oldPrice <= 0) return null;
    return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function getPrimaryProductImage(product) {
    const images = [...(product.product_images || [])]
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return images.find(image => image.is_primary) || images[0] || null;
}

function getInitials(name) {
    return (name || "SS").trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
}

function wishlistKey() { return "ss_spark_wishlist"; }
function getWishlist() {
    try { return JSON.parse(localStorage.getItem(wishlistKey()) || "[]"); }
    catch { return []; }
}
function isWishlisted(id) { return getWishlist().includes(id); }
function toggleHomepageWishlist(id, button) {
    const list = getWishlist().filter(item => item !== id);
    const active = !isWishlisted(id);
    if (active) list.push(id);
    localStorage.setItem(wishlistKey(), JSON.stringify(list));
    button.classList.toggle("active", active);
    button.textContent = active ? "♥" : "♡";
    button.setAttribute("aria-pressed", String(active));
}

async function getHomepageUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
}

async function ensureHomepageCart(userId) {
    let { data: cart, error } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) throw error;
    if (cart) return cart;

    const result = await supabase
        .from("carts")
        .insert({ user_id: userId })
        .select("id")
        .single();
    if (result.error) throw result.error;
    return result.data;
}

async function refreshHomepageCartCount(userId = null) {
    const countElement = document.getElementById("cartCount");
    if (!countElement) return;

    const user = userId ? { id: userId } : await getHomepageUser();
    if (!user) {
        countElement.textContent = "0";
        return;
    }

    const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
    if (!cart) {
        countElement.textContent = "0";
        return;
    }

    const { data: items } = await supabase.from("cart_items").select("quantity").eq("cart_id", cart.id);
    countElement.textContent = String((items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0));
}

async function addHomepageProductToCart(product) {
    const user = await getHomepageUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // The supplied cart_items table does not contain variant_id.
    // Variant selection therefore remains on product-details.html.
    const variants = product.product_variants || [];
    if (variants.some(v => v.is_active)) {
        window.location.href = `product-details.html?id=${encodeURIComponent(product.id)}`;
        return;
    }

    const stock = Number(product.stock_quantity || 0);
    if (stock < 1) return;

    try {
        const cart = await ensureHomepageCart(user.id);
        const { data: item, error: findError } = await supabase
            .from("cart_items")
            .select("id,quantity")
            .eq("cart_id", cart.id)
            .eq("product_id", product.id)
            .maybeSingle();
        if (findError) throw findError;

        const nextQuantity = Math.min(stock, Number(item?.quantity || 0) + 1);
        if (item) {
            const { error } = await supabase.from("cart_items").update({
                quantity: nextQuantity,
                updated_at: new Date().toISOString()
            }).eq("id", item.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from("cart_items").insert({
                cart_id: cart.id,
                product_id: product.id,
                quantity: 1
            });
            if (error) throw error;
        }

        await refreshHomepageCartCount(user.id);
        showHomepageToast("Added to cart");
    } catch (error) {
        console.error("Homepage add-to-cart error:", error);
        showHomepageToast("Unable to update your cart");
    }
}

function showHomepageToast(message) {
    let toast = document.getElementById("homepageToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "homepageToast";
        toast.className = "toast homepage-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__ssSparkToastTimer);
    window.__ssSparkToastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function productCardMarkup(product, badgeText) {
    const image = getPrimaryProductImage(product);
    const discount = getDiscount(product);
    const stockOut = Number(product.stock_quantity || 0) <= 0;
    const wishlisted = isWishlisted(product.id);
    const imageMarkup = image
        ? `<img class="product-card-image" src="${escapeHtml(image.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
        : `<div class="product-initials">${getInitials(product.name)}</div>`;

    return `
        <article class="collection-product-card" data-product-id="${escapeHtml(product.id)}">
            <div class="collection-product-image">
                <span class="collection-badge">${badgeText}</span>
                ${imageMarkup}
                <div class="product-shimmer"></div>
                <button type="button" class="collection-wishlist${wishlisted ? " active" : ""}" aria-label="Add ${escapeHtml(product.name)} to wishlist" aria-pressed="${wishlisted}">${wishlisted ? "♥" : "♡"}</button>
            </div>
            <div class="collection-product-info">
                <div class="collection-rating">★★★★★</div>
                <h3>${escapeHtml(product.name)}</h3>
                <p class="collection-price">${money(product.price)} ${product.compare_at_price && Number(product.compare_at_price) > Number(product.price) ? `<span>${money(product.compare_at_price)}</span>` : ""} ${discount ? `<small>${discount}% OFF</small>` : ""}</p>
                <button type="button" class="collection-add-cart" ${stockOut ? "disabled" : ""}>${stockOut ? "Sold Out" : ((product.product_variants || []).some(v => v.is_active) ? "Choose Options" : "Add to Cart")}</button>
            </div>
        </article>`;
}

function setupCollectionCarousel({ containerId, dotsId, prevId, nextId, sectionId, flag, badge }) {
    const container = document.getElementById(containerId);
    const dots = document.getElementById(dotsId);
    const prev = document.getElementById(prevId);
    const next = document.getElementById(nextId);
    const section = document.getElementById(sectionId);
    if (!container || !dots || !prev || !next || !section) return null;

    const state = { items: [] };

    function render() {
        container.innerHTML = state.items.map(item => productCardMarkup(item, badge)).join("");
        dots.innerHTML = state.items.map((_, i) => `<button type="button" class="collection-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="Go to product ${i + 1}"></button>`).join("");

        container.querySelectorAll(".collection-product-card").forEach((card, index) => {
            const product = state.items[index];
            card.addEventListener("click", event => {
                if (event.target.closest("button")) return;
                window.location.href = `product-details.html?id=${encodeURIComponent(product.id)}`;
            });
            card.querySelector(".collection-wishlist")?.addEventListener("click", event => {
                event.stopPropagation();
                toggleHomepageWishlist(product.id, event.currentTarget);
            });
            card.querySelector(".collection-add-cart")?.addEventListener("click", async event => {
                event.stopPropagation();
                const button = event.currentTarget;
                button.disabled = true;
                await addHomepageProductToCart(product);
                button.disabled = Number(product.stock_quantity || 0) <= 0;
                button.textContent = (product.product_variants || []).some(v => v.is_active) ? "Choose Options" : "Add to Cart";
            });
        });

        dots.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
            const card = container.children[Number(button.dataset.index)];
            card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        }));
        updateControls();
    }

    function updateControls() {
        const max = Math.max(0, container.scrollWidth - container.clientWidth);
        prev.disabled = container.scrollLeft <= 5;
        next.disabled = container.scrollLeft >= max - 5;
        let closest = 0, distance = Infinity;
        [...container.children].forEach((card, i) => {
            const d = Math.abs(card.offsetLeft - container.scrollLeft);
            if (d < distance) { distance = d; closest = i; }
        });
        dots.querySelectorAll("button").forEach((dot, i) => dot.classList.toggle("active", i === closest));
    }

    prev.addEventListener("click", () => container.scrollBy({ left: -container.clientWidth * 0.82, behavior: "smooth" }));
    next.addEventListener("click", () => container.scrollBy({ left: container.clientWidth * 0.82, behavior: "smooth" }));
    container.addEventListener("scroll", updateControls, { passive: true });

    return {
        load: async () => {
            const { data, error } = await supabase
                .from("products")
                .select(`id,name,slug,description,price,compare_at_price,stock_quantity,is_active,is_new_arrival,is_best_seller,is_featured,display_order,created_at,product_images(id,image_url,is_primary,display_order),product_variants(id,is_active)`)
                .eq("is_active", true)
                .eq(flag, true)
                .order("display_order", { ascending: true })
                .order("created_at", { ascending: false });

            if (error) {
                console.error(`Error loading ${flag} products:`, error);
                section.style.display = "none";
                return;
            }
            state.items = data || [];
            if (!state.items.length) {
                section.style.display = "none";
                return;
            }
            render();
        }
    };
}

const newArrivalsCarousel = setupCollectionCarousel({
    containerId: "newArrivalsProducts", dotsId: "newArrivalsDots", prevId: "newArrivalsPrevBtn", nextId: "newArrivalsNextBtn",
    sectionId: "newArrivalsSection", flag: "is_new_arrival", badge: "NEW"
});
const bestSellerCarousel = setupCollectionCarousel({
    containerId: "bestSellerProducts", dotsId: "bestSellersDots", prevId: "bestSellersPrevBtn", nextId: "bestSellersNextBtn",
    sectionId: "bestSellersSection", flag: "is_best_seller", badge: "BEST SELLER"
});
newArrivalsCarousel?.load();
bestSellerCarousel?.load();

async function loadCustomerViews() {
    const section = document.getElementById("customerViewsSection");
    const track = document.getElementById("testimonialTrack");
    const dots = document.getElementById("testimonialDots");
    const prev = document.getElementById("testimonialPrevBtn");
    const next = document.getElementById("testimonialNextBtn");

    if (!section || !track || !dots || !prev || !next) return;

    const { data, error } = await supabase
        .from("parameter_values")
        .select("parameter_name,description,display_order")
        .eq("parameter_group", "HOME_PAGE")
        .like("parameter_code", "CUSTOMER_VIEW_%")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

    if (error) {
        console.error("Error loading customer views:", error);
        section.style.display = "none";
        return;
    }

    const reviews = (data || []).filter(
        row => row.parameter_name && row.description
    );

    if (!reviews.length) {
        section.style.display = "none";
        return;
    }

    track.innerHTML = reviews.map((review, index) => `
    <article class="testimonial-card${index === 0 ? " active" : ""}">

        <div class="testimonial-customer">
            <div class="testimonial-avatar">
                ${escapeHtml(getInitials(review.parameter_name))}
            </div>

            <div class="testimonial-customer-info">
                <div class="testimonial-name">
                    ${escapeHtml(review.parameter_name)}
                </div>

                <div class="testimonial-label">
                    Verified Customer
                </div>
            </div>
        </div>

        <div class="testimonial-stars">★★★★★</div>

        <blockquote>
            “${escapeHtml(review.description)}”
        </blockquote>

        <div class="testimonial-divider"></div>

    </article>
`).join("");

    let current = 0;
    let timer = null;

    function getVisibleCards() {
        if (window.innerWidth <= 600) return 1;
        if (window.innerWidth <= 900) return 2;
        return 3;
    }

    function updateSlider() {
        const cards = track.querySelectorAll(".testimonial-card");

        if (!cards.length) return;

        const visibleCards = getVisibleCards();
        const maxIndex = Math.max(0, reviews.length - visibleCards);

        if (current > maxIndex) {
            current = maxIndex;
        }

        const card = cards[0];

        if (!card) return;

        const cardWidth = card.getBoundingClientRect().width;
        const trackStyle = window.getComputedStyle(track);
        const gap = parseFloat(trackStyle.gap) || 0;

        const moveAmount = cardWidth + gap;

        track.style.transform =
            `translateX(-${current * moveAmount}px)`;

        cards.forEach((item, index) => {
            item.classList.toggle(
                "active",
                index === current
            );
        });

        dots.querySelectorAll("button").forEach((dot, index) => {
            dot.classList.toggle(
                "active",
                index === current
            );
        });

        prev.disabled = current === 0;
        next.disabled = current >= maxIndex;
    }

    function renderDots() {
        const visibleCards = getVisibleCards();
        const pageCount =
            Math.max(1, reviews.length - visibleCards + 1);

        dots.innerHTML = Array.from(
            { length: pageCount },
            (_, index) => `
                <button
                    type="button"
                    class="testimonial-dot${index === 0 ? " active" : ""}"
                    aria-label="Go to customer review ${index + 1}">
                </button>
            `
        ).join("");

        dots.querySelectorAll("button").forEach(
            (dot, index) => {
                dot.addEventListener("click", () => {
                    current = index;
                    updateSlider();
                    start();
                });
            }
        );
    }

    function show(index, restart = true) {
        const visibleCards = getVisibleCards();
        const maxIndex =
            Math.max(0, reviews.length - visibleCards);

        current = Math.max(
            0,
            Math.min(index, maxIndex)
        );

        updateSlider();

        if (restart) {
            start();
        }
    }

    function start() {
        clearInterval(timer);

        const visibleCards = getVisibleCards();

        if (reviews.length <= visibleCards) {
            timer = null;
            return;
        }

        timer = setInterval(() => {
            const maxIndex =
                Math.max(0, reviews.length - visibleCards);

            if (current >= maxIndex) {
                current = 0;
            } else {
                current++;
            }

            updateSlider();
        }, 5000);
    }

    prev.addEventListener("click", () => {
        show(current - 1);
    });

    next.addEventListener("click", () => {
        show(current + 1);
    });

    window.addEventListener("resize", () => {
        renderDots();
        updateSlider();
    });

    renderDots();
    updateSlider();
    start();
}
loadCustomerViews();

/* Keep the header cart count synchronized with the logged-in user's cart. */
refreshHomepageCartCount();

/* Instagram URL placeholder: replace the value in data-instagram-url when ready. */
document.querySelectorAll("[data-instagram-url]").forEach(link => {
    link.href = link.dataset.instagramUrl || "https://www.instagram.com/";
});

/* =========================================================
   COLLECTION PAGE SUPPORT
   This section replaces collection.js so the project can use
   one JavaScript file for the homepage and collection pages.
========================================================= */

const collectionPageConfig = {
    new: {
        flag: "is_new_arrival",
        title: "New Arrivals",
        eyebrow: "JUST DROPPED",
        subtitle: "Fresh styles selected to bring a little more sparkle to your collection."
    },
    best: {
        flag: "is_best_seller",
        title: "Best Seller Products",
        eyebrow: "MOST LOVED",
        subtitle: "The pieces our customers keep coming back for."
    }
};

async function loadCollectionPage() {
    const type = document.body?.dataset?.collection;
    const config = collectionPageConfig[type];
    const grid = document.getElementById("collectionGrid");
    const status = document.getElementById("collectionStatus");
    const title = document.getElementById("collectionTitle");
    const subtitle = document.getElementById("collectionSubtitle");

    if (!config || !grid) {
        if (status && document.body?.dataset?.collection) {
            status.textContent = "Collection unavailable.";
        }
        return;
    }

    document.title = `${config.title} | SS Spark Collections`;
    if (title) title.textContent = config.title;
    if (subtitle) subtitle.textContent = config.subtitle;

    try {
        const { data, error } = await supabase
            .from("products")
            .select(`
                id,
                category_id,
                name,
                slug,
                description,
                price,
                compare_at_price,
                stock_quantity,
                is_active,
                is_new_arrival,
                is_best_seller,
                is_featured,
                display_order,
                created_at,
                product_images(id,image_url,is_primary,display_order),
                product_variants(id,is_active)
            `)
            .eq("is_active", true)
            .eq(config.flag, true)
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false });

        if (error) throw error;

        const products = data || [];

        if (status) {
            status.textContent = products.length
                ? `${products.length} pieces in this collection`
                : "No products are available in this collection yet.";
        }

        renderCollectionPageProducts(products, type, grid);
    } catch (error) {
        console.error("Collection load error:", error);
        if (status) status.textContent = "Unable to load this collection right now.";
    }
}

function renderCollectionPageProducts(products, type, grid) {
    grid.innerHTML = products.map(product => {
        const image = getPrimaryProductImage(product);
        const sale = getDiscount(product);
        const out = Number(product.stock_quantity || 0) <= 0;
        const hasVariants = (product.product_variants || []).some(v => v.is_active);
        const wishlisted = isWishlisted(product.id);

        return `
            <article class="collection-product-card collection-page-card" data-product-id="${escapeHtml(product.id)}">
                <div class="collection-product-image">
                    <span class="collection-badge">${type === "new" ? "NEW" : "BEST SELLER"}</span>
                    ${image
                        ? `<img class="product-card-image" src="${escapeHtml(image.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
                        : `<div class="product-initials">${getInitials(product.name)}</div>`}
                    <div class="product-shimmer"></div>
                    <button type="button" class="collection-wishlist${wishlisted ? " active" : ""}" aria-label="Add ${escapeHtml(product.name)} to wishlist" aria-pressed="${wishlisted}">${wishlisted ? "♥" : "♡"}</button>
                </div>
                <div class="collection-product-info">
                    <div class="collection-rating">★★★★★</div>
                    <h3>${escapeHtml(product.name)}</h3>
                    <p class="collection-price">
                        ${money(product.price)}
                        ${Number(product.compare_at_price) > Number(product.price) ? `<span>${money(product.compare_at_price)}</span>` : ""}
                        ${sale ? `<small>${sale}% OFF</small>` : ""}
                    </p>
                    <button type="button" class="collection-add-cart" ${out ? "disabled" : ""}>
                        ${out ? "Sold Out" : hasVariants ? "Choose Options" : "Add to Cart"}
                    </button>
                </div>
            </article>`;
    }).join("");

    grid.querySelectorAll(".collection-page-card").forEach((card, index) => {
        const product = products[index];

        card.addEventListener("click", event => {
            if (event.target.closest("button")) return;
            window.location.href = `product-details.html?id=${encodeURIComponent(product.id)}`;
        });

        card.querySelector(".collection-wishlist")?.addEventListener("click", event => {
            event.stopPropagation();
            toggleHomepageWishlist(product.id, event.currentTarget);
        });

        card.querySelector(".collection-add-cart")?.addEventListener("click", async event => {
            event.stopPropagation();
            const button = event.currentTarget;
            const hasVariants = (product.product_variants || []).some(v => v.is_active);

            button.disabled = true;
            try {
                await addHomepageProductToCart(product);
            } finally {
                const soldOut = Number(product.stock_quantity || 0) <= 0;
                button.disabled = soldOut;
                button.textContent = soldOut
                    ? "Sold Out"
                    : hasVariants
                        ? "Choose Options"
                        : "Add to Cart";
            }
        });
    });
}

loadCollectionPage();
