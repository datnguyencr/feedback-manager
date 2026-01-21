import * as Auth from "./auth.js";
import * as Utils from "./utils.js";

let comicData = null;
let loadToken = 0;

async function loadComic() {
    const params = new URLSearchParams(window.location.search);
    const comicId = params.get("id");
    const volFromUrl = Number(params.get("vol"));

    if (!comicId) {
        throw new Error("Missing comic id in URL");
    }

    const res = await fetch("assets/data/comics.json");
    if (!res.ok) throw new Error("Failed to load comics.json");

    const comics = await res.json();

    comicData = comics.find((c) => c.id === comicId);
    if (!comicData) {
        throw new Error(`Comic not found: ${comicId}`);
    }

    document.getElementById("title").innerText = comicData.title;

    setupVolumeSelector();
    const initialVolume =
        comicData.volumes.find((v) => v.volume === volFromUrl)?.volume ??
        comicData.volumes[0].volume;
    updateUrlVolume(initialVolume);
    loadVolume(initialVolume);
    syncVolumeSelect(initialVolume);
}
function syncVolumeSelect(volume) {
    const select = document.getElementById("volumeSelect");
    select.value = volume;
}

function updateUrlVolume(volume) {
    const url = new URL(window.location.href);
    url.searchParams.set("vol", volume);
    history.replaceState({}, "", url);
}

function setupVolumeSelector() {
    const select = document.getElementById("volumeSelect");
    select.innerHTML = "";

    comicData.volumes.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.volume;
        opt.textContent = `Volume ${v.volume}`;
        select.appendChild(opt);
    });

    select.onchange = () => {
        const vol = Number(select.value);
        updateUrlVolume(vol);
        select.disabled = true;
        loadVolume(vol);
        select.disabled = false;
    };
}
async function loadVolume(volumeNumber) {
    const myToken = ++loadToken; // invalidate all previous loads
    const reader = document.getElementById("reader");
    reader.replaceChildren();

    const volume = comicData.volumes.find((v) => v.volume === volumeNumber);
    if (!volume) return;

    const volFolder = `vol${String(volumeNumber).padStart(2, "0")}`;

    for (let i = 0; i < volume.pageCount; i++) {
        if (myToken !== loadToken) return;
        const page = String(i).padStart(3, "0");
        const url = `${comicData.path}/${volFolder}/${page}.avif.enc`;

        // Decrypt to ArrayBuffer
        const blobUrl = await Utils.fetchAndDecrypt(url, "image/avif");
        if (myToken !== loadToken) {
            URL.revokeObjectURL(blobUrl);
            return;
        }
        const img = new Image();

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = blobUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(blobUrl);

        reader.appendChild(canvas);
    }
}
function getPages() {
    const reader = document.getElementById("reader");
    return Array.from(reader.querySelectorAll("canvas"));
}
function getCurrentPageIndex() {
    const pages = getPages();
    const scrollTop = window.scrollY;
    for (let i = pages.length - 1; i >= 0; i--) {
        const rect = pages[i].getBoundingClientRect();
        const pageTop = rect.top + window.scrollY;
        if (scrollTop >= pageTop - 10) return i;
    }
    return 0;
}

document.addEventListener("DOMContentLoaded", async () => {
    loadComic().catch((err) => {
        console.error(err);
        document.getElementById(
            "reader"
        ).innerHTML = `<p class="text-center text-red-400">Failed to load comic.</p>`;
    });
    document.addEventListener("keydown", (e) => {
        const pages = getPages();
        if (!pages.length) return;

        // ignore inputs/selects
        if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;

        let currentPage = getCurrentPageIndex();

        switch (e.key) {
            case "ArrowLeft":
                e.preventDefault();
                currentPage = Math.max(0, currentPage - 1);
                pages[currentPage].scrollIntoView({ behavior: "smooth" });
                break;

            case "ArrowRight":
                e.preventDefault();
                currentPage = Math.min(pages.length - 1, currentPage + 1);
                pages[currentPage].scrollIntoView({ behavior: "smooth" });
                break;

            case "ArrowUp":
                e.preventDefault();
                window.scrollBy({ top: -300, behavior: "smooth" });
                break;

            case "ArrowDown":
                e.preventDefault();
                window.scrollBy({ top: 300, behavior: "smooth" });
                break;

            case "Home":
                e.preventDefault();
                pages[0].scrollIntoView({ behavior: "smooth" });
                break;

            case "End":
                e.preventDefault();
                pages[pages.length - 1].scrollIntoView({ behavior: "smooth" });
                break;
        }
    });
    const scrollBtn = document.getElementById("scrollTopBtn");

    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
            scrollBtn.classList.remove("hidden");
        } else {
            scrollBtn.classList.add("hidden");
        }
    });

    scrollBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    await Utils.loadDialog(
        "templates/confirm-sign-out-dialog.html",
        "confirmSignOutDialog"
    );
    const signOutDialog = Utils.setupDialog({
        dialogId: "confirmSignOutDialog",
        openBtn: null,
        onNegativePressed: () => {},
        onPositivePressed: async () => {
            await Auth.logout();
        },
    });

    Auth.observeAuth((user) => {
        renderAccount(user);
    });
    function renderAccount(user) {
        const el = document.querySelector("#account");
        el.replaceChildren();
        if (user) {
            el.innerHTML = `<img
                src="${user.photoURL}"
                title="${user.email}"
                class="w-8 h-8 rounded-full cursor-pointer flex-shrink-0"
            />`;
            el.onclick = () => {
                signOutDialog.open();
            };
        } else {
            el.innerHTML = `<div
                        class="w-8 h-8 rounded-full bg-zinc-700 cursor-pointer flex-shrink-0"
                        title="Sign in"></div>`;
            el.onclick = () => Auth.login();
        }
    }
    if (Utils.isProduction()) {
        Utils.enableContentProtection();
    }
});
