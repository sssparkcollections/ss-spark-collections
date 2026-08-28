import { supabase } from "./supabase-client.js";

let currentSlide = 0;

const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");



function showSlide(index) {

    if (index >= slides.length) {
        currentSlide = 0;
    }

    else if (index < 0) {
        currentSlide = slides.length - 1;
    }

    else {
        currentSlide = index;
    }


    slides.forEach(function(slide) {
        slide.classList.remove("active");
    });


    dots.forEach(function(dot) {
        dot.classList.remove("active");
    });


    slides[currentSlide].classList.add("active");

    dots[currentSlide].classList.add("active");
}


function nextSlide() {

    showSlide(currentSlide + 1);

}


function previousSlide() {

    showSlide(currentSlide - 1);

}


function goToSlide(index) {

    showSlide(index);

}


/* Automatic Slider */

setInterval(function() {

    nextSlide();

}, 5000);

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

            <a href="orders.html" class="profile-menu-item">
                <span>♧</span>
                <span>My Orders</span>
            </a>

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