document.addEventListener("DOMContentLoaded", async () => {

    const navigationContainer =
        document.getElementById("adminNavigation");

    if (!navigationContainer) {
        console.warn("Admin navigation container not found.");
        return;
    }

    try {

        /* =====================================================
           LOAD ADMIN NAVIGATION
           ===================================================== */

        const response =
            await fetch("admin-navigation.html");

        if (!response.ok) {
            throw new Error(
                `Navigation load failed: ${response.status}`
            );
        }

        const navigationHTML =
            await response.text();

        navigationContainer.innerHTML =
            navigationHTML;


        /* =====================================================
           ACTIVE NAVIGATION
           ===================================================== */

        const currentPage =
            document.body.dataset.adminPage;

        if (currentPage) {

            const activeItem =
                navigationContainer.querySelector(
                    `.nav-item[data-page="${currentPage}"]`
                );

            if (activeItem) {
                activeItem.classList.add("active");
            }
        }


        /* =====================================================
           ADMIN PROFILE DROPDOWN
           IMPORTANT:
           This MUST run AFTER navigationHTML is injected.
           ===================================================== */

        const adminProfile =
            document.getElementById("adminProfile");

        const adminProfileTrigger =
            document.getElementById("adminProfileTrigger");

        const adminProfileMenu =
            document.getElementById("adminProfileMenu");


        if (
            adminProfile &&
            adminProfileTrigger &&
            adminProfileMenu
        ) {

            /* Open / Close dropdown */

            adminProfileTrigger.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    const isOpen =
                        adminProfile.classList.toggle("open");

                    adminProfileTrigger.setAttribute(
                        "aria-expanded",
                        isOpen ? "true" : "false"
                    );

                }
            );


            /* Prevent menu click from closing itself */

            adminProfileMenu.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                }
            );


            /* Close when clicking outside */

            document.addEventListener(
                "click",
                () => {

                    adminProfile.classList.remove("open");

                    adminProfileTrigger.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }
            );

        }


        /* =====================================================
           LOGOUT
           ===================================================== */

        const logoutBtn =
            document.getElementById("logoutBtn");

        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                async () => {

                    try {

                        if (
                            typeof supabase !== "undefined" &&
                            supabase?.auth
                        ) {

                            await supabase.auth.signOut();

                        }

                    } catch (error) {

                        console.error(
                            "Logout failed:",
                            error
                        );

                    }

                    window.location.href =
                        "index.html";

                }
            );

        }

    } catch (error) {

        console.error(
            "Failed to load admin navigation:",
            error
        );

    }

});