import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAZLTmex2JqItkYIYjoyv3H_4zlOXAj1bY",
    authDomain: "comics-nest-852f5.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
    prompt: "select_account",
});

export function login() {
    return signInWithPopup(auth, provider);
}

export function logout() {
    return signOut(auth);
}
export function observeAuth(callback) {
    return onAuthStateChanged(auth, callback);
}
