// @ts-nocheck
/* Existing Firebase Authentication flow migrated to TypeScript without changing its behavior. */
import { initializeApp } from "firebase/app";
        import { 
            getAuth, 
            createUserWithEmailAndPassword, 
            signInWithEmailAndPassword, 
            signInWithPopup, 
            GoogleAuthProvider, 
            onAuthStateChanged,
            signOut,
            sendEmailVerification,
            sendPasswordResetEmail
        } from "firebase/auth";

        const firebaseConfig = {
              apiKey: "AIzaSyAlixKQr90Wn2u1kOkE7erppf7omed5KXU",
              authDomain: "quans-175a2.firebaseapp.com",
              projectId: "quans-175a2",
              storageBucket: "quans-175a2.firebasestorage.app",
              messagingSenderId: "221298439204",
              appId: "1:221298439204:web:47b39c005411c979ca54b1",
              measurementId: "G-J6EZ37W65Y"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const googleProvider = new GoogleAuthProvider();

        // Native website style error mask converter
        function handleAuthError(error) {
            switch(error.code) {
                case 'auth/invalid-email':
                    return 'Please enter a valid email address style.';
                case 'auth/user-disabled':
                    return 'This system account has been disabled.';
                case 'auth/user-not-found':
                    return 'No matching profile registry found.';
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    return 'Incorrect account credentials. Please verify your email and password.';
                case 'auth/email-already-in-use':
                    return 'This email layout is already linked to an active account registry.';
                case 'auth/weak-password':
                    return 'Password must be at least 6 characters long.';
                case 'auth/popup-closed-by-user':
                    return 'Verification window closed before authentication profile could finish connecting.';
                case 'auth/cancelled-popup-request':
                    return 'Authentication connection processing sequence terminated.';
                case 'auth/popup-blocked':
                    return 'Verification interface blocked by system window layout rules.';
                case 'auth/requires-recent-login':
                    return 'Security protocol requires a fresh session token. Please log out and sign back in to try again.';
                default:
                    return error.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim();
            }
        }

        // --- SIGNUP FORM EVENT LISTENER ---
        // Global utility state holders for your OTP operational system
        let generatedOTP = "";
        let resendCooldownTimer = null;
        let cooldownSecondsLeft = 0;

        // 🛠️ FIX: Store the original layout state of the signup form right when the page loads
        let initialSignupFormHTML = "";
        document.addEventListener("DOMContentLoaded", () => {
            const signupFormEl = document.getElementById('signupForm');
            if (signupFormEl) {
                initialSignupFormHTML = signupFormEl.innerHTML;
            }
        });

        // 🛠️ GLOBAL UTILITY: Call this function whenever a user logs out or closes the popup!
        window.resetSignupFormToInitialState = function() {
            if (resendCooldownTimer) clearInterval(resendCooldownTimer);
            cooldownSecondsLeft = 0;
            generatedOTP = "";
            
            const signupFormEl = document.getElementById('signupForm');
            if (signupFormEl && initialSignupFormHTML) {
                signupFormEl.innerHTML = initialSignupFormHTML;
            }
        };

        // Isolated function helper to dispatch EmailJS requests cleanly
        function sendOtpViaEmailJS(emailAddress, otpCode, errorDivElement) {
            // ⚠️ REMEMBER: Change "YOUR_SERVICE_ID" and "YOUR_TEMPLATE_ID" to your actual EmailJS key strings
            return emailjs.send("service_72k9plm", "template_2ku6o4k", {
                to_email: emailAddress,
                verification_code: otpCode
            })
            .catch((err) => {
                errorDivElement.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-100');
                const textNode = errorDivElement.querySelector('.error-text');
                if (textNode) {
                    textNode.innerText = "Technical failure delivering OTP. Please try again.";
                } else {
                    errorDivElement.innerText = "⚠️ Technical failure delivering OTP. Please try again.";
                }
                errorDivElement.classList.remove('hidden');
                console.error("EmailJS sending error log:", err);
                throw err;
            });
        }

        // Functional control handler to run your resend button visual counter mechanics
        function startResendCooldownClock() {
            const resendBtn = document.getElementById('resendOtpBtn');
            if (!resendBtn) return;

            cooldownSecondsLeft = 30;
            resendBtn.disabled = true;
            resendBtn.classList.remove('text-blue-600', 'hover:underline', 'cursor-pointer');
            resendBtn.classList.add('text-slate-400', 'cursor-not-allowed');
            resendBtn.innerText = `Resend Code (${cooldownSecondsLeft}s)`;

            resendCooldownTimer = setInterval(() => {
                cooldownSecondsLeft--;
                if (cooldownSecondsLeft <= 0) {
                    clearInterval(resendCooldownTimer);
                    resendBtn.disabled = false;
                    resendBtn.classList.add('text-blue-600', 'hover:underline', 'cursor-pointer');
                    resendBtn.classList.remove('text-slate-400', 'cursor-not-allowed');
                    resendBtn.innerText = "Resend Code";
                } else {
                    resendBtn.innerText = `Resend Code (${cooldownSecondsLeft}s)`;
                }
            }, 1000);
        }

        // --- THE COMPLETE SIGNUP FORM INTERACTION LISTENER ---
        document.getElementById('signupForm').addEventListener('submit', (e) => {
            // 🛠️ FIX: THIS MUST RUN FIRST! Prevents HTML from redirecting/reloading the page immediately
            e.preventDefault(); 

            const errDiv = document.getElementById('signupErrorMsg');
            if (errDiv) {
                errDiv.classList.add('hidden');
            }

            const emailInput = document.getElementById('signupEmailInput').value.trim();
            const passwordInput = document.getElementById('signupPasswordInput').value;
            const signupFormEl = document.getElementById('signupForm');

            // 🛠️ 1. INSTANT WEBSITE PASSWORD VALIDATION (Bulletproof check against internal null crashes)
            if (passwordInput.length < 6) {
                if (errDiv) {
                    errDiv.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-100');
                    
                    // Safe selector check to prevent script crashes
                    const errorTextContainer = errDiv.querySelector('.error-text');
                    if (errorTextContainer) {
                        errorTextContainer.innerText = "Password must be at least 6 characters long.";
                    } else {
                        errDiv.innerText = "⚠️ Password must be at least 6 characters long.";
                    }
                    
                    errDiv.classList.remove('hidden');
                } else {
                    // Fallback alert box if your DOM container element doesn't exist at all
                    alert("Password must be at least 6 characters long.");
                }
                return; // 🛑 Stops execution instantly right here! No redirect, no reload.
            }

            // 2. Initialize a secure random 6-digit numeric verification sequence string
            generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

            // 3. Fire the first verification email sequence via EmailJS (No account created yet!)
            sendOtpViaEmailJS(emailInput, generatedOTP, errDiv)
                .then(() => {
                    // 4. Keep the signup wrapper open but slide a dynamic overlay view inside it
                    signupFormEl.innerHTML = `
                        <div class="text-center py-4 px-2 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                            <div class="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto text-xl shadow-md mb-3">
                                🛡️
                            </div>
                            <h3 class="text-xl font-bold text-slate-800 mb-1">Verify Your Email</h3>
                            <p class="text-sm text-slate-600 mb-5 leading-relaxed">
                                We sent a 6-digit verification code security token to:<br>
                                <strong class="text-slate-900 font-semibold">${emailInput}</strong>
                            </p>
                            
                            <div class="mb-5">
                                <input id="otpCodeInput" type="text" maxlength="6" required placeholder="000000" 
                                    class="w-full text-center tracking-widest text-2xl px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 transition-all">
                                <p id="otpInlineError" class="text-xs text-rose-600 mt-2 font-semibold hidden">⚠️ Incorrect verification code. Please check again.</p>
                            </div>

                            <button type="button" id="verifyOtpBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-full shadow-md transition-all mb-4">
                                Confirm & Sign Up
                            </button>

                            <div class="text-xs text-slate-500">
                                Didn't receive the email? 
                                <button type="button" id="resendOtpBtn" class="font-bold text-blue-600 hover:underline outline-none bg-transparent border-none p-0 transition-all">
                                    Resend Code
                                </button>
                            </div>
                        </div>
                    `;

                    startResendCooldownClock();

                    // --- ACTION SUB-HANDLER A: VALIDATING ENTERED OTP ---
                    document.getElementById('verifyOtpBtn').addEventListener('click', (otpEvent) => {
                        otpEvent.preventDefault(); // Prevents layout bubbling
                        
                        const userEnteredOTP = document.getElementById('otpCodeInput').value.trim();
                        const otpErrorLabel = document.getElementById('otpInlineError');
                        otpErrorLabel.classList.add('hidden');

                        if (userEnteredOTP === generatedOTP) {
                            // 5. Code is correct! NOW we attempt to create the account in Firebase
                            createUserWithEmailAndPassword(auth, emailInput, passwordInput)
                                .then((userCredential) => {
                                    if(resendCooldownTimer) clearInterval(resendCooldownTimer);

                                    // 6. UPDATE BACKGROUND HTML (User logged-in view renders behind popup)
                                    if (typeof window.updateUIForLoggedInUser === 'function') {
                                        window.updateUIForLoggedInUser(userCredential.user);
                                    }

                                    // 🛠️ CLOSE POPUP INSTANTLY
                                    if (typeof window.closeAuthPopup === 'function') {
                                        window.closeAuthPopup();
                                    } else {
                                        const modal = signupFormEl.closest('.modal') || signupFormEl.parentElement;
                                        if(modal) modal.classList.add('hidden');
                                    }

                                    // 🛠️ RESET THE FORM FOR THE NEXT TIME THEY SEE IT
                                    window.resetSignupFormToInitialState();
                                })
                                .catch((error) => {
                                    let customMsg = "Registration failed: " + error.message;
                                    if (error.code === 'auth/email-already-in-use') { customMsg = "This email address is already registered."; }
                                    else if (error.code === 'auth/invalid-email') { customMsg = "The email address structure is invalid."; }
                                    
                                    otpErrorLabel.innerText = "⚠️ " + customMsg;
                                    otpErrorLabel.classList.remove('hidden');
                                });
                        } else {
                            otpErrorLabel.innerText = "⚠️ Incorrect verification code. Please check again.";
                            otpErrorLabel.classList.remove('hidden');
                        }
                    });

                    // --- ACTION SUB-HANDLER B: RESENDING CODES ON REQUEST ---
                    document.getElementById('resendOtpBtn').addEventListener('click', () => {
                        if (cooldownSecondsLeft > 0) return;

                        generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
                        const otpErrorLabel = document.getElementById('otpInlineError');
                        otpErrorLabel.classList.add('hidden');

                        sendOtpViaEmailJS(emailInput, generatedOTP, errDiv)
                            .then(() => {
                                startResendCooldownClock();
                            });
                    });
                });
        });

      
        // --- LOGIN FORM EVENT LISTENER ---
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const errDiv = document.getElementById('loginErrorMsg');
            
            // Reset message container styles back to hidden first
            if (errDiv) {
                errDiv.classList.add('hidden');
            }

            const emailInput = document.getElementById('loginEmailInput').value.trim();
            const passwordInput = document.getElementById('loginPasswordInput').value;

            // Save a reference to the main login form element container
            const loginFormEl = document.getElementById('loginForm');

            signInWithEmailAndPassword(auth, emailInput, passwordInput)
                .then((userCredential) => {
                    // 🛠️ SUCCESS PHASE: Account exists and matches!
                    // Clear form values out completely
                    loginFormEl.reset();

                    // Update background HTML for the newly authenticated user
                    if (typeof window.updateUIForLoggedInUser === 'function') {
                        window.updateUIForLoggedInUser(userCredential.user);
                    }
                    
                    // Close the authentication modal wrapper view instantly
                    if (typeof window.closeAuthPopup === 'function') {
                        window.closeAuthPopup();
                    } else {
                        const modal = loginFormEl.closest('.modal') || loginFormEl.parentElement;
                        if(modal) modal.classList.add('hidden');
                    }

                    // 🛠️ FIX: Wipe out fields and reset to original state automatically right after closing!
                    if (typeof window.resetLoginFormToInitialState === 'function') {
                        window.resetLoginFormToInitialState();
                    }
                })
                .catch((error) => {
                    // 🛠️ FAILURE PHASE: Pass Firebase error codes clean straight to the view text container
                    if (errDiv) {
                        errDiv.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-100');
                        errDiv.classList.remove('bg-amber-50', 'text-amber-700', 'border-amber-200');

                        let customMsg = "Authentication error: " + error.message;
                        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') { 
                            customMsg = "Incorrect email address or password credentials."; 
                        } else if (error.code === 'auth/user-disabled') { 
                            customMsg = "This user account profile has been suspended."; 
                        } else if (error.code === 'auth/invalid-email') {
                            customMsg = "The email address structure is invalid.";
                        }
                        
                        // Safe selector assignment check to prevent script crashes
                        const errorTextContainer = errDiv.querySelector('.error-text');
                        if (errorTextContainer) {
                            errorTextContainer.innerText = customMsg;
                        } else {
                            errDiv.innerText = "⚠️ " + customMsg;
                        }
                        
                        errDiv.classList.remove('hidden');
                    } else {
                        alert("Authentication failure: " + error.message);
                    }
                });
        });

        // --- COMPLETE FORGOT PASSWORD SYSTEM ---

        // 1. Declare the template container structure state safely on the global window object
        if (typeof window.initialLoginFormHTML === 'undefined') {
            window.initialLoginFormHTML = "";
        }
        
        // 2. Expose the resetting function globally so your "X" close icons can use it too!
        window.forceResetLoginPopup = function() {
            const loginFormEl = document.getElementById('loginForm');
            const errDiv = document.getElementById('loginErrorMsg');
            
            if (errDiv) {
                errDiv.classList.add('hidden');
            }
            
            if (loginFormEl) {
                // Restore the original raw form HTML (inputs, buttons, links)
                if (window.initialLoginFormHTML) {
                    loginFormEl.innerHTML = window.initialLoginFormHTML;
                }
                // Wipes out typed characters inside input boxes cleanly
                if (typeof loginFormEl.reset === 'function') {
                    loginFormEl.reset(); 
                }
            }
        };
        
        // 3. Wrap everything in an initializer that waits for the DOM to be completely ready
        function initializeForgotPasswordSystem() {
            const forgotLink = document.getElementById('forgotPasswordLink');
            const loginFormEl = document.getElementById('loginForm');
        
            // Save the clean, initial inner state template of your login window form right now
            if (loginFormEl && !window.initialLoginFormHTML) {
                window.initialLoginFormHTML = loginFormEl.innerHTML;
            }
        
            // Stop execution safely if the forgot password link isn't rendered on this specific page view
            if (!forgotLink) return;
        
            // Remove any older duplicate event listeners to prevent double-firing bugs
            forgotLink.replaceWith(forgotLink.cloneNode(true));
            
            // Re-select the freshly cleared clean element node link
            const activeForgotLink = document.getElementById('forgotPasswordLink');
        
            activeForgotLink.addEventListener('click', (e) => {
                e.preventDefault(); 
                
                const currentLoginFormEl = document.getElementById('loginForm');
                const errDiv = document.getElementById('loginErrorMsg');
                
                // Safety checkpoint check: Ensure the backup string exists
                if (currentLoginFormEl && !window.initialLoginFormHTML) {
                    window.initialLoginFormHTML = currentLoginFormEl.innerHTML;
                }
        
                const emailField = document.getElementById('loginEmailInput');
                const emailInput = emailField ? emailField.value.trim() : "";
        
                // 🚨 CHECK 1: If the email address input box field is empty
                if (!emailInput) {
                    if (errDiv) {
                        errDiv.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-100');
                        errDiv.classList.remove('hidden');
                        
                        const errorTextContainer = errDiv.querySelector('.error-text');
                        if (errorTextContainer) {
                            errorTextContainer.innerText = "Please enter your email address first to get a reset link.";
                        } else {
                            errDiv.innerText = "⚠️ Please enter your email address first to get a reset link.";
                        }
                    } else {
                        alert("Please enter your email address first to get a reset link.");
                    }
                    return; // Stop right here!
                }
        
                // 🚨 CHECK 2: Strict email format validation via Regular Expression
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailInput)) {
                    if (errDiv) {
                        errDiv.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-100');
                        errDiv.classList.remove('hidden');
                        
                        const errorTextContainer = errDiv.querySelector('.error-text');
                        if (errorTextContainer) {
                            errorTextContainer.innerText = "The email address layout structure is invalid.";
                        } else {
                            errDiv.innerText = "⚠️ The email address layout structure is invalid.";
                        }
                    } else {
                        alert("The email address layout structure is invalid.");
                    }
                    return; // Stop right here!
                }
        
                // Clean slate: Clear past error frames out before making the network request API call
                if (errDiv) errDiv.classList.add('hidden');
        
                // 🚀 FIRE FIREBASE NETWORK REQUEST LINK DELIVERER
                sendPasswordResetEmail(auth, emailInput)
                    .then(() => {
                        // SUCCESS PHASE: Render response interface success confirmation frame template inside the popup box
                        currentLoginFormEl.innerHTML = `
                            <div class="text-center py-6 px-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm animate-fadeIn">
                                <div class="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto text-xl shadow-md mb-3">
                                    📩
                                </div>
                                <h3 class="text-xl font-bold text-emerald-900 mb-1">Reset Link Sent!</h3>
                                <p class="text-sm text-emerald-700 mb-5 leading-relaxed">
                                    We have sent a secure password reset link to:<br>
                                    <strong class="text-emerald-900 font-semibold">${emailInput}</strong>
                                </p>
                                <p class="text-xs text-slate-500 mb-5">
                                    Please check your inbox or spam folder to recover access.
                                </p>
                                <button type="button" id="closeForgotSuccessBtn" class="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-6 rounded-full shadow-md transition-all">
                                    Close Window
                                </button>
                            </div>
                        `;
        
                        // Handle closing and wiping out components
                        document.getElementById('closeForgotSuccessBtn').addEventListener('click', (btnEvent) => {
                            btnEvent.preventDefault();
        
                            // Close the popup window layer modal cleanly
                            if (typeof window.closeAuthPopup === 'function') {
                                window.closeAuthPopup();
                            } else {
                                const modal = currentLoginFormEl.closest('.modal') || currentLoginFormEl.parentElement;
                                if (modal) modal.classList.add('hidden');
                            }
        
                            // Wipes fields and resets the template instantly as it closes!
                            window.forceResetLoginPopup();
                        });
                    })
                    .catch((error) => {
                        // FAILURE PHASE: Handle non-existent accounts safely from Firebase response
                        if (errDiv) {
                            errDiv.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-100');
                            errDiv.classList.remove('hidden');
                            
                            let customMsg = "Error sending reset link: " + error.message;
                            if (error.code === 'auth/user-not-found') {
                                customMsg = "No account found matching this email address.";
                            } else if (error.code === 'auth/invalid-email') {
                                customMsg = "The email address structure layout is invalid.";
                            }
        
                            const errorTextContainer = errDiv.querySelector('.error-text');
                            if (errorTextContainer) {
                                errorTextContainer.innerText = customMsg;
                            } else {
                                errDiv.innerText = "⚠️ " + customMsg;
                            }
                        } else {
                            alert("Reset Error: " + error.message);
                        }
                    });
            });
        }
        
        // 4. Run the code safely whether the browser window loaded early or late!
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initializeForgotPasswordSystem);
        } else {
            initializeForgotPasswordSystem();
        }
        
        const handleGoogleAuthFlow = () => {
            signInWithPopup(auth, googleProvider)
                .catch((error) => {
                    if (error.code === 'auth/popup-closed-by-user') { alert("Sign-in popup closed before completion."); }
                    else if (error.code === 'auth/cancelled-popup-request') { alert("Authentication operation conflict detected."); }
                    else if (error.code === 'auth/popup-blocked') { alert("Authentication popup blocked by browser settings."); }
                    else { alert(`Google sign-in error: ${error.message}`); }
                });
        };

        document.getElementById('googleSignupBtn').addEventListener('click', handleGoogleAuthFlow);
        document.getElementById('googleLoginBtn').addEventListener('click', handleGoogleAuthFlow);

        // =========================================================================
        // ON AUTH STATE CHANGED INTERACTION FRAMEWORK
        // =========================================================================
        const navAuthGroup = document.getElementById('navAuthGroup');
        const initialNavHTML = navAuthGroup ? navAuthGroup.innerHTML : "";

        onAuthStateChanged(auth, (user) => {
            if (user) {
                window.userIsAuthenticated = true;
                
                if (typeof window.closeAuthPopup === 'function') window.closeAuthPopup();
                if (typeof window.closeLoginPopup === 'function') window.closeLoginPopup();
        
                if (navAuthGroup) {
                    navAuthGroup.innerHTML = `
                        <div class="flex items-center space-x-3 fade-in">
                            <div class="relative inline-block text-left">
                                <button onclick="toggleUserDropdown(event)" class="flex items-center space-x-1 text-base font-semibold text-slate-800 dark:text-slate-200 hover:text-brand-blue tracking-tight outline-none group">
                                    <span>Hello!</span>
                                    <i class="fa-solid fa-chevron-down text-xs transition-transform group-hover:translate-y-0.5"></i>
                                </button>
                                <div id="userDropdownMenu" class="hidden absolute right-0 mt-2.5 w-40 origin-top-right rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden">
                                    <button id="firebaseSettingsTriggerBtn" class="w-full text-left px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2">
                                        <i class="fa-solid fa-gear text-xs text-slate-500 dark:text-slate-400"></i>
                                        <span>Settings</span>
                                    </button>
                                    <hr class="border-slate-100/80 dark:border-slate-800">
                                    <button id="firebaseLogoutBtn" class="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2">
                                        <i class="fa-solid fa-right-from-bracket text-xs text-slate-400 dark:text-slate-500"></i>
                                        <span>Log out</span>
                                    </button>
                                </div>
                            </div>
                            <button id="openMobileMenu" class="md:hidden flex items-center justify-center w-9 h-9 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs">
                                <i class="fa-solid fa-bars text-sm"></i>
                            </button>
                        </div>
                    `;
                    
                    document.getElementById('firebaseSettingsTriggerBtn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const dropdownMenu = document.getElementById('userDropdownMenu');
                        if (dropdownMenu) dropdownMenu.classList.add('hidden');
                        openSettingsPopupSystem();
                    });

                    document.getElementById('firebaseLogoutBtn').addEventListener('click', () => {
                        signOut(auth).then(() => {
                            closeSettingsPopupSystem();
                        }).catch((err) => { alert(handleAuthError(err)); });
                    });
                }
                
                const targetDisplayEmailSpan = document.getElementById("settingsEmailTextDisplay");
                if (targetDisplayEmailSpan) targetDisplayEmailSpan.innerText = user.email || "No Email Provided";

            } else {
                window.userIsAuthenticated = false;
                if (navAuthGroup) navAuthGroup.innerHTML = initialNavHTML;
                closeSettingsPopupSystem();
            }
        });

        // =========================================================================
        // LAYOUT SETTINGS POPUP SYSTEM INTERACTION ARCHITECTURE
        // =========================================================================
        const settingsPopupModal = document.getElementById("settingsPopupModal");
        const settingsHardDeleteModal = document.getElementById("settingsHardDeleteModal");
        
        const tabBtnAccount = document.getElementById("tabBtnAccount");
        const tabBtnAppearance = document.getElementById("tabBtnAppearance");
        const panelSectionAccount = document.getElementById("panelSectionAccount");
        const panelSectionAppearance = document.getElementById("panelSectionAppearance");

        function openSettingsPopupSystem() {
            if (!settingsPopupModal) return;
            settingsPopupModal.classList.remove("hidden");
            settingsPopupModal.classList.add("flex");
            // Clear past alert banner messages whenever popup mounts
            const settingsAlertMsg = document.getElementById("settingsAlertMsg");
            if (settingsAlertMsg) settingsAlertMsg.classList.add("hidden");
            switchSettingsActiveTab("account");
        }

        function closeSettingsPopupSystem() {
            if (settingsPopupModal) {
                settingsPopupModal.classList.remove("flex");
                settingsPopupModal.classList.add("hidden");
            }
            closeHardDeleteModalSystem();
        }

        function switchSettingsActiveTab(targetViewMode) {
            if (targetViewMode === "account") {
                tabBtnAccount.className = "flex-1 md:flex-initial flex items-center justify-center md:justify-start space-x-3 px-4 py-3 rounded-xl text-sm font-bold tracking-tight transition-all bg-brand-blue text-white shadow-sm";
                tabBtnAppearance.className = "flex-1 md:flex-initial flex items-center justify-center md:justify-start space-x-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-tight transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";
                
                panelSectionAccount.classList.remove("hidden");
                panelSectionAppearance.classList.add("hidden");
            } else {
                tabBtnAppearance.className = "flex-1 md:flex-initial flex items-center justify-center md:justify-start space-x-3 px-4 py-3 rounded-xl text-sm font-bold tracking-tight transition-all bg-brand-blue text-white shadow-sm";
                tabBtnAccount.className = "flex-1 md:flex-initial flex items-center justify-center md:justify-start space-x-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-tight transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";
                
                panelSectionAppearance.classList.remove("hidden");
                panelSectionAccount.classList.add("hidden");
            }
        }

        if(tabBtnAccount) tabBtnAccount.addEventListener("click", () => switchSettingsActiveTab("account"));
        if(tabBtnAppearance) tabBtnAppearance.addEventListener("click", () => switchSettingsActiveTab("appearance"));

        const closeTriggers = ["closeSettingsDesktopBtn", "closeSettingsMobileBtn"];
        closeTriggers.forEach(btnId => {
            const btnEl = document.getElementById(btnId);
            if (btnEl) btnEl.addEventListener("click", closeSettingsPopupSystem);
        });

        // --- PASSWORD RESET TRIGGERS ---
        const settingsChangePasswordBtn = document.getElementById("settingsChangePasswordBtn");
        const settingsAlertMsg = document.getElementById("settingsAlertMsg");

        if (settingsChangePasswordBtn) {
            settingsChangePasswordBtn.addEventListener("click", async () => {
                const activeUser = auth.currentUser;
                if (!activeUser || !activeUser.email) return;
                try {
                    await sendPasswordResetEmail(auth, activeUser.email);
                    if (settingsAlertMsg) {
                        settingsAlertMsg.className = "flex items-center space-x-2 bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40 text-sm font-semibold p-4 rounded-2xl mb-4 fade-in";
                        settingsAlertMsg.querySelector('.alert-text').innerText = `A verification reset link has been securely sent to: ${activeUser.email}`;
                        settingsAlertMsg.classList.remove('hidden');
                    }
                } catch (error) {
                    if (settingsAlertMsg) {
                        settingsAlertMsg.className = "flex items-center space-x-2 bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40 text-sm font-semibold p-4 rounded-2xl mb-4 fade-in";
                        settingsAlertMsg.querySelector('.alert-text').innerText = handleAuthError(error);
                        settingsAlertMsg.classList.remove('hidden');
                    }
                }
            });
        }

        const settingsLogoutBtn = document.getElementById("settingsLogoutBtn");
        if (settingsLogoutBtn) {
            settingsLogoutBtn.addEventListener("click", () => {
                signOut(auth).catch(err => alert(handleAuthError(err)));
            });
        }

        // --- SECURE PERMANENT ACCOUNT DELETION BLOCK ---
        const settingsOpenDeleteModalBtn = document.getElementById("settingsOpenDeleteModalBtn");
        const settingsCancelDeleteBtn = document.getElementById("settingsCancelDeleteBtn");
        const settingsDeleteChallengeInput = document.getElementById("settingsDeleteChallengeInput");
        const settingsConfirmHardDeleteBtn = document.getElementById("settingsConfirmHardDeleteBtn");
        const settingsDeleteInlineError = document.getElementById("settingsDeleteInlineError");

        if (settingsOpenDeleteModalBtn) {
            settingsOpenDeleteModalBtn.addEventListener("click", () => {
                if (settingsDeleteChallengeInput) settingsDeleteChallengeInput.value = "";
                if (settingsDeleteInlineError) settingsDeleteInlineError.classList.add("hidden");
                if (settingsConfirmHardDeleteBtn) {
                    settingsConfirmHardDeleteBtn.disabled = true;
                    settingsConfirmHardDeleteBtn.className = "flex-1 py-3 px-4 rounded-xl text-sm font-bold tracking-tight bg-rose-600 text-white opacity-40 cursor-not-allowed shadow-md transition-all";
                }
                if (settingsHardDeleteModal) {
                    settingsHardDeleteModal.classList.remove("hidden");
                    settingsHardDeleteModal.classList.add("flex");
                }
            });
        }

        function closeHardDeleteModalSystem() {
            if (settingsHardDeleteModal) {
                settingsHardDeleteModal.classList.remove("flex");
                settingsHardDeleteModal.classList.add("hidden");
            }
        }

        if (settingsCancelDeleteBtn) settingsCancelDeleteBtn.addEventListener("click", closeHardDeleteModalSystem);

        if (settingsDeleteChallengeInput) {
            settingsDeleteChallengeInput.addEventListener("input", (e) => {
                if (e.target.value === "Delete My Account") {
                    if (settingsDeleteInlineError) settingsDeleteInlineError.classList.add("hidden");
                    settingsConfirmHardDeleteBtn.disabled = false;
                    settingsConfirmHardDeleteBtn.className = "flex-1 py-3 px-4 rounded-xl text-sm font-bold tracking-tight bg-rose-600 text-white shadow-md transition-all";
                } else {
                    settingsConfirmHardDeleteBtn.disabled = true;
                    settingsConfirmHardDeleteBtn.className = "flex-1 py-3 px-4 rounded-xl text-sm font-bold tracking-tight bg-rose-600 text-white opacity-40 cursor-not-allowed shadow-md transition-all";
                }
            });
        }

        function showToast(message, type = 'success') {
        // 1. Check or create the toast wrapper container
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            // Positioned perfectly at the upper center, stacking items vertically down
            toastContainer.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-[9999] space-y-3 max-w-sm w-full px-4 flex flex-col items-center';
            document.body.appendChild(toastContainer);
        }
    
        // 2. Create the individual toast element
        const toast = document.createElement('div');
        
        // -translate-y-4 makes it start slightly higher up for a slide-down effect
        const baseStyles = 'p-4 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-3 border transition-all duration-300 transform -translate-y-4 opacity-0 w-full';
        const typeStyles = type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' 
            : 'bg-rose-50 text-rose-800 border-rose-200/80';
            
        toast.className = `${baseStyles} ${typeStyles}`;
    
        // Select the appropriate icon
        const icon = type === 'success' 
            ? '<i class="fa-solid fa-circle-check text-emerald-600 text-base flex-shrink-0"></i>' 
            : '<i class="fa-solid fa-circle-exclamation text-rose-600 text-base flex-shrink-0"></i>';
    
        toast.innerHTML = `${icon}<span class="flex-grow">${message}</span>`;
        toastContainer.appendChild(toast);
    
        // 3. Trigger downward entry slide animation
        setTimeout(() => {
            toast.classList.remove('-translate-y-4', 'opacity-0');
        }, 10);
    
        // 4. Smoothly slide up and fade away after 3.5 seconds
        setTimeout(() => {
            toast.classList.add('-translate-y-4', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
        if (settingsConfirmHardDeleteBtn) {
            settingsConfirmHardDeleteBtn.addEventListener("click", async () => {
                const user = auth.currentUser;
                if (user) {
                    user.delete().then(() => {
                        // Show custom success website toast
                        showToast("Account Deleted Successfully.", "success");
                        
                        // Allow 1.5 seconds for the toast to be seen before navigating away
                        setTimeout(() => {
                            if (typeof closeSettingsPopupSystem === "function") {
                                closeSettingsPopupSystem(); // Close the modal layout cleanly
                            }
                            window.location.href = "index.html"; // Safe exit redirect routing
                        }, 4000);
                        
                    }).catch((error) => {
                        // Show custom error website toast instead of chrome popup alert
                        showToast(handleAuthError(error), "error");
                    });
                }
            });
        }

        // =========================================================================
        // PRODUCTION THEME SWITCHING ENGINE
        // =========================================================================
        const btnThemeLight = document.getElementById('themeSelectorBtnLight');
        const btnThemeDark = document.getElementById('themeSelectorBtnDark');

        function processThemeApplication(selectedTheme) {
            const documentHtmlElement = document.documentElement;
            
            if (selectedTheme === 'dark') {
                documentHtmlElement.classList.add('dark');
            } else {
                documentHtmlElement.classList.remove('dark');
            }
            
            localStorage.setItem('quans-app-theme', selectedTheme);
            syncThemeVisualInterface(selectedTheme);
        }

        function syncThemeVisualInterface(activeTheme) {
            const buttonsArray = [btnThemeLight, btnThemeDark];
            buttonsArray.forEach(btn => {
                if (btn) {
                    btn.classList.remove('border-brand-blue');
                    btn.classList.add('border-transparent');
                }
            });

            if (activeTheme === 'light' && btnThemeLight) {
                btnThemeLight.classList.remove('border-transparent');
                btnThemeLight.classList.add('border-brand-blue');
            } else if (activeTheme === 'dark' && btnThemeDark) {
                btnThemeDark.classList.remove('border-transparent');
                btnThemeDark.classList.add('border-brand-blue');
            }
        }

        if (btnThemeLight) btnThemeLight.addEventListener('click', () => processThemeApplication('light'));
        if (btnThemeDark) btnThemeDark.addEventListener('click', () => processThemeApplication('dark'));

        const cachedUserThemeSelection = localStorage.getItem('quans-app-theme') || 'light';
        processThemeApplication(cachedUserThemeSelection);
