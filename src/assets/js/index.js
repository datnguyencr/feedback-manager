import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getDatabase,
    ref,
    onValue,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAWE3-_J2k0LN07hwsjkxtX_lwUZHyS0LU",
    authDomain: "feedback-manager-fa4a2.firebaseapp.com",
    databaseURL:
        "https://feedback-manager-fa4a2-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "feedback-manager-fa4a2",
    storageBucket: "feedback-manager-fa4a2.firebasestorage.app",
    messagingSenderId: "971012047862",
    appId: "1:971012047862:web:a5db54d3d73fe9967d3dd7",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

const adminEmail = "datnguyen.cr@gmail.com";

// DOM Elements
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const feedbackList = document.getElementById("feedbackList");
const loadingIndicator = document.getElementById("loadingIndicator");
const statsCount = document.getElementById("statsCount");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const userAvatar = document.getElementById("userAvatar");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

let allFeedback = [];

// Auth Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email === adminEmail) {
            showDashboard(user);
        } else {
            alert("Access denied: You are not authorized.");
            await signOut(auth);
            showLogin();
        }
    } else {
        showLogin();
    }
});

// Auth Functions
window.handleLogin = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login failed:", error);
        alert("Login failed: " + error.message);
    }
};

window.handleLogout = async () => {
    console.log("Logging out...");
    try {
        await signOut(auth);
        console.log("Logged out successfully");
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

// UI Transitions
function showLogin() {
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    loadingIndicator.classList.add("hidden");
}

function showDashboard(user) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    loadingIndicator.classList.add("hidden");
    userEmailDisplay.textContent = user.email;
    userAvatar.src =
        user.photoURL || "https://ui-avatars.com/api/?name=" + user.email;
    loadFeedback();
}

// Data Handling
function loadFeedback() {
    const feedbackRef = ref(db, "feedback");
    onValue(feedbackRef, (snap) => {
        allFeedback = [];
        snap.forEach((child) => {
            allFeedback.push({
                id: child.key,
                ...child.val(),
            });
        });
        allFeedback.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        renderFeedback();
    });
}
const CATEGORY_STYLES = {
    bug: {
        badge: "bg-red-500/30 text-red-400",
        border: "border-red-500/50",
        text: "text-red-500",
    },
    idea: {
        badge: "bg-emerald-500/30 text-emerald-400",
        border: "border-emerald-500/50",
        text: "text-emerald-500",
    },
    other: {
        badge: "bg-zinc-500/30 text-zinc-400",
        border: "border-zinc-500/50",
        text: "text-gray-400",
    },
};
const DEFAULT_STYLE = {
    badge: "bg-blue-500/30 text-blue-400",
    border: "border-blue-500/50",
    text: "text-zinc-500",
};

function renderFeedback() {
    const query = (searchInput.value || "").toLowerCase();
    const category = categoryFilter.value;

    const filtered = allFeedback.filter((item) => {
        const matchesQuery =
            item.appId?.toLowerCase().includes(query) ||
            item.message?.toLowerCase().includes(query);
        const matchesCategory = !category || item.category === category;
        return matchesQuery && matchesCategory;
    });

    statsCount.textContent = filtered.length;

    feedbackList.innerHTML = filtered
        .map((item) => {
            const style = CATEGORY_STYLES[item.category] || DEFAULT_STYLE;
            console.log(style);
            return `
        <div class="glass-card border-2 ${style.border} p-4 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="flex items-start justify-between mb-2">
            <div>
              <span class="inline-block px-3 py-1 text-white text-lg font-semibold mb-2">
                ${item.appId || "Unknown App"}
              </span>

            </div>

            <div class="text-xs text-zinc-500">
              ${formatDate(item.createdAt)}
            </div>
          </div>                   

                <span class="px-3 py-1 ${style.badge} rounded-full text-xs font-semibold">
                ${item.category || "Feedback"}
              </span>
          
          <p class="text-zinc-200 text-sm leading-relaxed mt-4">
            ${item.message}
          </p>
        </div>
      `;
        })
        .join("");

    if (filtered.length === 0) {
        feedbackList.innerHTML = `
      <div class="text-center py-20 text-zinc-500 w-full col-span-full">
        <i class="opacity-20 text-4xl mb-4 block">📭</i>
        No feedback found matching your criteria
      </div>
    `;
    }
}

function formatDate(timestamp) {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Event Listeners
searchInput.addEventListener("input", renderFeedback);
categoryFilter.addEventListener("change", renderFeedback);
