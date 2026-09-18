import { supabase } from "./supabase-client.js";


// ============================================
// SIGN UP
// ============================================

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const fullName =
            document.getElementById("fullName").value.trim();

        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const password =
            document.getElementById("password").value;

        const phone =
            document.getElementById("phone").value.trim();

        const message =
            document.getElementById("signupMessage");

        const submitButton =
            signupForm.querySelector('button[type="submit"]');

        // Prevent accidental double-click / duplicate signup requests.
        if (submitButton?.disabled) return;

        if (!fullName || !email || !password || !phone) {
            message.textContent = "Please complete all required fields.";
            window.showSignupAlert?.("Please complete all required fields.", "error", "Check your details");
            return;
        }

        if (!/^[6-9][0-9]{9}$/.test(phone)) {
            message.textContent = "Please enter a valid 10-digit Indian mobile number.";
            window.showSignupAlert?.("Please enter a valid 10-digit Indian mobile number.", "error", "Invalid mobile number");
            return;
        }

        message.textContent = "Creating your account...";
        window.showSignupAlert?.("Creating your SS Spark account...", "info", "Creating account");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.setAttribute("aria-busy", "true");
        }

        try {

            /*
             * Supabase Auth is the source of truth for account existence.
             * The Auth database already enforces unique email addresses.
             *
             * With email confirmation enabled, Supabase may intentionally
             * return a user with an empty identities array for an email that
             * is already registered. Detect that case and do not continue
             * as if a new account was created.
             */
            const { data, error } = await supabase.auth.signUp({

                email: email,

                password: password,

                options: {
                    // Always return to the live SS Spark Collections homepage
                    // after the user confirms their email.
                    emailRedirectTo: "https://sssparkcollections.github.io/ss-spark-collections/index.html",
                    data: {
                        full_name: fullName,
                        phone: phone
                    }
                }

            });

            if (error) {

                console.error("Signup error:", error);

                const errorText = String(error.message || "").toLowerCase();

                if (
                    errorText.includes("already registered") ||
                    errorText.includes("already exists") ||
                    errorText.includes("user already")
                ) {
                    message.textContent =
                        "An account with this email already exists. Please log in instead.";
                    window.showSignupAlert?.(
                        "An account with this email already exists. Please log in instead.",
                        "error",
                        "Account already exists"
                    );
                } else {
                    message.textContent =
                        "Signup failed: " + (error.message || "Unable to create account.");
                    window.showSignupAlert?.(
                        error.message || "Unable to create your account. Please try again.",
                        "error",
                        "Signup failed"
                    );
                }

                return;
            }

            /*
             * When email confirmation is enabled, this is the important
             * duplicate-account check for existing users. Supabase can return
             * an obfuscated existing user with no identities.
             */
            const identities = data?.user?.identities;

            if (
                data?.user &&
                Array.isArray(identities) &&
                identities.length === 0
            ) {
                message.textContent =
                    "An account with this email already exists. Please log in instead.";
                window.showSignupAlert?.(
                    "An account with this email already exists. Please log in instead.",
                    "error",
                    "Account already exists"
                );
                return;
            }

            if (!data?.user) {
                message.textContent =
                    "Unable to create the account. Please try again.";
                window.showSignupAlert?.(
                    "Unable to create the account. Please try again.",
                    "error",
                    "Signup failed"
                );
                return;
            }

            console.log("Signup successful:", data);

            /*
             * The database trigger handle_new_user() reads full_name and phone
             * from raw_user_meta_data and creates the matching profiles row.
             */
            message.textContent =
                "Account created successfully! Please check your email to verify your account.";
            window.showSignupAlert?.(
                "Your account was created successfully. Please check your email to verify your account.",
                "success",
                "Account created"
            );

            signupForm.reset();

        } catch (error) {

            console.error("Unexpected signup error:", error);

            message.textContent =
                "Signup failed. Please try again.";
            window.showSignupAlert?.(
                "Unable to create your account. Please try again.",
                "error",
                "Signup failed"
            );

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.removeAttribute("aria-busy");
            }

        }

    });

}



// ============================================
// FORGOT PASSWORD
// ============================================

const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordScreen = document.getElementById("forgotPasswordScreen");
const forgotCancelBtn = document.getElementById("forgotCancelBtn");
const forgotSubmitBtn = document.getElementById("forgotSubmitBtn");
const forgotEmailInput = document.getElementById("forgotEmail");
const forgotPasswordStatus = document.getElementById("forgotPasswordStatus");
const forgotSuccessBox = document.getElementById("forgotSuccessBox");

forgotPasswordLink?.addEventListener("click", (event) => {
    event.preventDefault();
    forgotPasswordScreen?.classList.add("active");
    forgotPasswordScreen?.setAttribute("aria-hidden", "false");
    if (forgotEmailInput) {
        forgotEmailInput.value = document.getElementById("loginEmail")?.value?.trim() || "";
        forgotEmailInput.focus();
    }
    if (forgotPasswordStatus) forgotPasswordStatus.textContent = "";
    forgotSuccessBox?.classList.remove("active");
});

forgotCancelBtn?.addEventListener("click", () => {
    forgotPasswordScreen?.classList.remove("active");
    forgotPasswordScreen?.setAttribute("aria-hidden", "true");
});

forgotSubmitBtn?.addEventListener("click", async () => {
    const email = forgotEmailInput?.value?.trim().toLowerCase() || "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (forgotPasswordStatus) forgotPasswordStatus.textContent = "Please enter a valid email address.";
        window.showLoginAlert?.("Please enter a valid email address.", "error", "Invalid email");
        return;
    }
    if (forgotSubmitBtn.disabled) return;

    forgotSubmitBtn.disabled = true;
    forgotSubmitBtn.textContent = "Sending...";
    if (forgotPasswordStatus) forgotPasswordStatus.textContent = "Sending a secure password reset link...";

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: "https://sssparkcollections.github.io/ss-spark-collections/reset-password.html"
        });

        if (error) {
            console.error("Password reset error:", error);
            if (forgotPasswordStatus) forgotPasswordStatus.textContent = error.message || "Unable to send the reset email. Please try again.";
            window.showLoginAlert?.(error.message || "Unable to send the reset email. Please try again.", "error", "Reset link not sent");
            return;
        }

        if (forgotPasswordStatus) forgotPasswordStatus.textContent = "Please check your inbox. The secure reset link has been sent.";
        forgotSuccessBox?.classList.add("active");
        window.showLoginAlert?.("Please check your inbox for the secure password reset link.", "success", "Reset link sent");
    } catch (error) {
        console.error("Unexpected password reset error:", error);
        if (forgotPasswordStatus) forgotPasswordStatus.textContent = "Unable to send the reset email. Please try again.";
        window.showLoginAlert?.("Unable to send the reset email. Please try again.", "error", "Reset link not sent");
    } finally {
        forgotSubmitBtn.disabled = false;
        forgotSubmitBtn.textContent = "Send Reset Link";
    }
});

// ============================================
// RESET PASSWORD
// ============================================

const recoveryAlertStack = document.getElementById("recoveryAlertStack");

window.showRecoveryAlert = function showRecoveryAlert(message, type = "success", title = "") {
    if (!recoveryAlertStack) return;

    const alertEl = document.createElement("div");
    alertEl.className = `recovery-alert ${type}`;
    alertEl.setAttribute("role", "status");

    const iconEl = document.createElement("div");
    iconEl.className = "recovery-alert-icon";
    iconEl.textContent = type === "error" ? "!" : type === "info" ? "i" : "✓";

    const contentEl = document.createElement("div");
    contentEl.className = "recovery-alert-content";
    const titleEl = document.createElement("div");
    titleEl.className = "recovery-alert-title";
    titleEl.textContent = title || (type === "error" ? "Something went wrong" : type === "info" ? "Please wait" : "Done");
    const messageEl = document.createElement("div");
    messageEl.className = "recovery-alert-message";
    messageEl.textContent = message;

    contentEl.append(titleEl, messageEl);
    alertEl.append(iconEl, contentEl);
    recoveryAlertStack.appendChild(alertEl);

    window.setTimeout(() => {
        alertEl.classList.add("is-hiding");
        window.setTimeout(() => alertEl.remove(), 180);
    }, 3200);
};

const recoveryPasswordForm = document.getElementById("recoveryPasswordForm");

if (recoveryPasswordForm) {
    const recoveryPassword = document.getElementById("recoveryPassword");
    const recoveryPasswordConfirm = document.getElementById("recoveryPasswordConfirm");
    const recoveryStatus = document.getElementById("recoveryStatus");

    recoveryPasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = recoveryPassword?.value || "";
        const confirmPassword = recoveryPasswordConfirm?.value || "";

        if (password.length < 6) {
            recoveryStatus.textContent = "Password must be at least 6 characters.";
            window.showRecoveryAlert?.("Password must be at least 6 characters.", "error", "Password too short");
            return;
        }
        if (password !== confirmPassword) {
            recoveryStatus.textContent = "Passwords do not match.";
            window.showRecoveryAlert?.("Your new password and confirmation must match.", "error", "Passwords do not match");
            return;
        }

        try {
            recoveryStatus.textContent = "Updating your password securely...";
            window.showRecoveryAlert?.("Updating your password securely...", "info", "Updating password");
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                console.error("Password update error:", error);
                recoveryStatus.textContent = error.message || "Unable to update your password.";
                window.showRecoveryAlert?.(error.message || "Unable to update your password.", "error", "Password update failed");
                return;
            }
            recoveryStatus.textContent = "Password updated successfully. You can now log in.";
            window.showRecoveryAlert?.("Your password has been updated. Redirecting you to login...", "success", "Password updated");
            setTimeout(() => {
                window.location.href = "https://sssparkcollections.github.io/ss-spark-collections/index.html";
            }, 1200);
        } catch (error) {
            console.error("Unexpected password update error:", error);
            recoveryStatus.textContent = "Unable to update your password. Please try again.";
            window.showRecoveryAlert?.("Unable to update your password. Please try again.", "error", "Password update failed");
        }
    });
}


// ============================================
// LOGIN
// ============================================

const loginAlertStack = document.getElementById("loginAlertStack");

window.showLoginAlert = function showLoginAlert(message, type = "success", title = "") {
    if (!loginAlertStack) return;

    const alertEl = document.createElement("div");
    alertEl.className = `login-alert ${type}`;
    alertEl.setAttribute("role", "status");

    const iconEl = document.createElement("div");
    iconEl.className = "login-alert-icon";
    iconEl.textContent = type === "error" ? "!" : type === "info" ? "i" : "✓";

    const contentEl = document.createElement("div");
    contentEl.className = "login-alert-content";

    const titleEl = document.createElement("div");
    titleEl.className = "login-alert-title";
    titleEl.textContent = title || (type === "error" ? "Something went wrong" : type === "info" ? "Please wait" : "Done");

    const messageEl = document.createElement("div");
    messageEl.className = "login-alert-message";
    messageEl.textContent = message;

    contentEl.append(titleEl, messageEl);
    alertEl.append(iconEl, contentEl);
    loginAlertStack.appendChild(alertEl);

    window.setTimeout(() => {
        alertEl.classList.add("is-hiding");
        window.setTimeout(() => alertEl.remove(), 180);
    }, 3200);
};

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim().toLowerCase();

        const password =
            document.getElementById("loginPassword").value;

        const message =
            document.getElementById("loginMessage");

        const submitButton =
            loginForm.querySelector('button[type="submit"]');

        if (submitButton?.disabled) return;

        message.textContent = "Logging in...";
        window.showLoginAlert?.("Checking your account securely...", "info", "Signing in");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.setAttribute("aria-busy", "true");
        }

        try {

            const { data, error } =
                await supabase.auth.signInWithPassword({

                    email: email,

                    password: password

                });

            if (error) {

                console.error("Login error:", error);

                message.textContent =
                    "Login failed: " + error.message;
                window.showLoginAlert?.(
                    error.message || "Unable to log in. Please check your details and try again.",
                    "error",
                    "Login failed"
                );

                return;
            }

            console.log("Login successful:", data);

            message.textContent =
                "Login successful!";
            window.showLoginAlert?.("Welcome back! Redirecting you to SS Spark Collections...", "success", "Login successful");

            // Go back to homepage
            setTimeout(() => {
                window.location.href = "https://sssparkcollections.github.io/ss-spark-collections/index.html";
            }, 1000);

        } catch (error) {

            console.error("Unexpected login error:", error);

            message.textContent =
                "Login failed. Please try again.";
            window.showLoginAlert?.("Unable to log in right now. Please try again.", "error", "Login failed");

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.removeAttribute("aria-busy");
            }

        }

    });

}
