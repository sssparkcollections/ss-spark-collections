// collection.js
// Shared product collection loader
// Used by:
// new-arrivals.html
// best-sellers.html

import { supabase } from "./supabase-client.js";


document.addEventListener(
  "DOMContentLoaded",
  loadCollectionProducts
);


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function money(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return `₹${number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}


function getDiscount(product) {
  const oldPrice =
    Number(product.compare_at_price);

  const price =
    Number(product.price);

  if (
    !Number.isFinite(oldPrice) ||
    !Number.isFinite(price) ||
    oldPrice <= price ||
    oldPrice <= 0
  ) {
    return null;
  }

  return Math.round(
    ((oldPrice - price) / oldPrice) * 100
  );
}


function getSortedImages(images) {
  return [...(images || [])].sort(
    (a, b) =>
      (a.display_order || 0) -
      (b.display_order || 0)
  );
}


function getPrimaryImage(images) {
  const sorted =
    getSortedImages(images);

  return (
    sorted.find(
      image => image.is_primary
    ) ||
    sorted[0] ||
    null
  );
}


function getInitials(name) {
  if (!name) {
    return "SS";
  }

  const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    words[0].charAt(0) +
    words[1].charAt(0)
  ).toUpperCase();
}


/* =========================================================
   WISHLIST
========================================================= */

function getWishlist() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "ss_spark_wishlist"
      ) || "[]"
    );
  } catch {
    return [];
  }
}


function isWishlisted(id) {
  return getWishlist().includes(id);
}


/* =========================================================
   LOAD COLLECTION
========================================================= */

async function loadCollectionProducts() {

  const collectionType =
    document.body.dataset.collection;

  const container =
    document.getElementById(
      "collectionProducts"
    );

  if (!container) {
    console.error(
      "collectionProducts not found."
    );

    return;
  }


  let flag;
  let title;


  if (collectionType === "new") {

    flag = "is_new_arrival";
    title = "New Arrivals";

  } else if (
    collectionType === "best"
  ) {

    flag = "is_best_seller";
    title = "Best Sellers";

  } else {

    console.error(
      "Invalid collection type:",
      collectionType
    );

    return;
  }


  container.innerHTML = `
    <div class="loading-state">
      Loading ${title}...
    </div>
  `;


  try {

    const {
      data,
      error
    } = await supabase
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
        is_featured,
        is_best_seller,
        display_order,
        created_at,
        categories(
          id,
          name,
          slug
        ),
        product_images(
          id,
          image_url,
          is_primary,
          display_order
        )
      `)
      .eq("is_active", true)
      .eq(flag, true)
      .order("display_order", {
        ascending: true
      })
      .order("created_at", {
        ascending: false
      });


    if (error) {
      throw error;
    }


    if (!data || data.length === 0) {

      container.innerHTML = `
        <div class="empty-products">
          <h3>No ${title}</h3>
          <p>
            There are no products
            available right now.
          </p>
        </div>
      `;

      return;
    }


    container.innerHTML =
      data
        .map(createCollectionCard)
        .join("");


    attachEvents(container);


  } catch (error) {

    console.error(
      "Collection loading error:",
      error
    );

    container.innerHTML = `
      <div class="empty-products">
        <h3>Unable to load products</h3>
        <p>
          Please try again later.
        </p>
      </div>
    `;
  }
}


/* =========================================================
   PRODUCT CARD
========================================================= */

function createCollectionCard(product) {

  const image =
    getPrimaryImage(
      product.product_images
    );

  const discount =
    getDiscount(product);

  const outOfStock =
    Number(product.stock_quantity || 0) <= 0;


  return `
    <article class="product-card">

      <div class="product-image">

        ${
          product.is_new_arrival
            ? `<span class="badge">NEW</span>`
            : product.is_best_seller
              ? `<span class="badge">
                   BEST SELLER
                 </span>`
              : product.is_featured
                ? `<span class="badge">
                     FEATURED
                   </span>`
                : ""
        }


        <button
          class="wishlist ${
            isWishlisted(product.id)
              ? "active"
              : ""
          }"
          type="button"
          data-wishlist-id="${product.id}"
          aria-label="Wishlist"
          aria-pressed="${
            isWishlisted(product.id)
          }"
        >
          ${
            isWishlisted(product.id)
              ? "♥"
              : "♡"
          }
        </button>


        ${
          image
            ? `
              <img
                src="${escapeHtml(
                  image.image_url
                )}"
                alt="${escapeHtml(
                  product.name
                )}"
                loading="lazy"
                class="product-real-image"
              >
            `
            : `
              <div class="product-placeholder">
                <span>
                  ${getInitials(
                    product.name
                  )}
                </span>
              </div>
            `
        }

      </div>


      <div class="product-info">

        ${
          product.categories?.name
            ? `
              <p class="product-category">
                ${escapeHtml(
                  product.categories.name
                )}
              </p>
            `
            : ""
        }


        <h3 class="product-name">
          ${escapeHtml(
            product.name
          )}
        </h3>


        ${
          product.description
            ? `
              <p class="product-description">
                ${escapeHtml(
                  product.description
                )}
              </p>
            `
            : ""
        }


        <div class="price">

          <span class="current-price">
            ${money(product.price)}
          </span>

          ${
            discount
              ? `
                <span class="old-price">
                  ${money(
                    product.compare_at_price
                  )}
                </span>

                <span class="discount">
                  ${discount}% OFF
                </span>
              `
              : ""
          }

        </div>


        <button
          class="add-cart"
          type="button"
          data-product-id="${product.id}"
          ${outOfStock ? "disabled" : ""}
        >
          ${
            outOfStock
              ? "Out of Stock"
              : "View Product"
          }
        </button>

      </div>

    </article>
  `;
}


/* =========================================================
   EVENTS
========================================================= */

function attachEvents(container) {

  container
    .querySelectorAll(
      "[data-product-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const productId =
            button.dataset.productId;

          window.location.href =
            `product-details.html?id=${encodeURIComponent(
              productId
            )}`;
        }
      );
    });


  container
    .querySelectorAll(
      "[data-wishlist-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          const id =
            button.dataset.wishlistId;

          const list =
            getWishlist();

          const exists =
            list.includes(id);

          const updated =
            exists
              ? list.filter(
                  item => item !== id
                )
              : [...list, id];

          localStorage.setItem(
            "ss_spark_wishlist",
            JSON.stringify(updated)
          );

          button.classList.toggle(
            "active",
            !exists
          );

          button.textContent =
            !exists ? "♥" : "♡";

          button.setAttribute(
            "aria-pressed",
            String(!exists)
          );
        }
      );
    });


  container
    .querySelectorAll(
      ".product-real-image"
    )
    .forEach(image => {

      image.addEventListener(
        "click",
        () => {

          const card =
            image.closest(
              ".product-card"
            );

          const button =
            card?.querySelector(
              "[data-product-id]"
            );

          if (!button) {
            return;
          }

          window.location.href =
            `product-details.html?id=${encodeURIComponent(
              button.dataset.productId
            )}`;
        }
      );
    });
}