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
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("signupMessage");


        message.textContent = "Creating your account...";


        const { data, error } = await supabase.auth.signUp({

            email: email,

            password: password,

            options: {
                data: {
                    full_name: fullName
                }
            }

        });


        if (error) {

            console.error(error);

            message.textContent =
                "Signup failed: " + error.message;

            return;
        }


        console.log("Signup successful:", data);

        message.textContent =
            "Account created successfully! Please check your email to verify your account.";

        signupForm.reset();

    });

}


// ============================================
// LOGIN
// ============================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();


        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;


        const message =
            document.getElementById("loginMessage");


        message.textContent = "Logging in...";


        const { data, error } =
            await supabase.auth.signInWithPassword({

                email: email,

                password: password

            });


        if (error) {

            console.error(error);

            message.textContent =
                "Login failed: " + error.message;

            return;
        }


        console.log("Login successful:", data);

        message.textContent =
            "Login successful!";


        // Go back to homepage
        setTimeout(() => {

            window.location.href = "index.html";

        }, 1000);

    });

}