import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, getDoc, setDoc } from './firebase-config.js';

export const Auth = {
    currentUser: null,

    init() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            this.updateUI(user);

            if (user) {
                // Sync user to Firestore
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        uid: user.uid,
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        joinedAt: new Date(),
                        reputationScore: 0,
                        badges: ['novice']
                    });
                }
            }
        });

        // Bind Login Buttons
        const loginBtns = document.querySelectorAll('#login-btn');
        loginBtns.forEach(btn => {
            btn.addEventListener('click', () => this.login());
        });
    },

    async login() {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed. Please try again.");
        }
    },

    async logout() {
        try {
            await signOut(auth);
            window.location.reload();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    },

    updateUI(user) {
        const loginBtn = document.getElementById('login-btn');
        const userProfile = document.getElementById('user-profile'); // Assuming we add this to nav

        if (user) {
            if (loginBtn) {
                loginBtn.textContent = 'LOGOUT';
                loginBtn.onclick = () => this.logout();
                // Optional: Show avatar if we add that element
            }
        } else {
            if (loginBtn) {
                loginBtn.textContent = 'LOGIN';
                loginBtn.onclick = () => this.login();
            }
        }
    },

    // Guard for protected actions
    requireAuth() {
        if (!this.currentUser) {
            this.login();
            return false;
        }
        return true;
    }
};
