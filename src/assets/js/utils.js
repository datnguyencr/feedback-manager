// Cache for multiple templates
const templateCache = new Map();

/**
 * Load a template from an external HTML file.
 * @param {string} url - URL of the HTML file containing a <template>.
 * @returns {HTMLTemplateElement} - The <template> element from the file.
 */
export async function loadTemplate(url) {
    if (templateCache.has(url)) {
        return templateCache.get(url);
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load template: ${url}`);

    const html = await res.text();
    const container = document.createElement("div");
    container.innerHTML = html;

    const template = container.querySelector("template");
    if (!template) throw new Error(`No <template> found in ${url}`);
    const clonedTemplate = template.cloneNode(true);
    templateCache.set(url, clonedTemplate);
    return clonedTemplate;
}
// Cache to track loaded dialogs
const dialogCache = new Map();

/**
 * Load a dialog from external HTML and append it to the body.
 * Only loads once.
 * @param {string} url - URL of the HTML file containing a <template> or dialog HTML.
 * @param {string} dialogId - The id of the dialog element inside the HTML.
 * @returns {HTMLElement} - The dialog element in the DOM.
 */
export async function loadDialog(url, dialogId) {
    if (dialogCache.has(dialogId)) {
        return dialogCache.get(dialogId);
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load dialog: ${url}`);

    const html = await res.text();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    let dialog = wrapper.querySelector(`#${dialogId}`);
    if (!dialog) {
        const tpl = wrapper.querySelector("template");
        if (!tpl) throw new Error(`No dialog or template found in ${url}`);
        dialog = tpl.content.firstElementChild;
    }
    const clonedDialog = dialog.cloneNode(true);
    document.body.appendChild(clonedDialog);
    dialogCache.set(dialogId, clonedDialog);
    return clonedDialog;
}

// AES-GCM 32-byte key (same as Python)
const KEY_BYTES = new TextEncoder().encode("692b0630a29e5454545444fa2ee5f630");

/**
 * Decrypts an encrypted .enc file (AES-GCM) and returns a Blob URL
 * @param {string} url - path to the .enc file
 * @param {string} mimeType - MIME type of the original file (e.g., "image/avif")
 * @returns {Promise<string>} - Blob URL to assign to img.src
 */
export async function fetchAndDecrypt(url, mimeType = "image/avif") {
    if (hostile) {
        throw new Error("Access revoked");
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    const buffer = await res.arrayBuffer();

    const nonce = buffer.slice(0, 12);
    const data = buffer.slice(12);

    const key = await crypto.subtle.importKey(
        "raw",
        KEY_BYTES,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce },
        key,
        data
    );

    return URL.createObjectURL(new Blob([decrypted], { type: mimeType }));
}

function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
}
export function hasAccess() {
    return localStorage.getItem("accessKey") === getTodayKey();
}
export function setAccess(key) {
    localStorage.setItem("accessKey", key);
}

let devToolsOpen = false;
let hostile = false;
export function enableContentProtection() {
    // ================= Right-Click Block =================
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    loadDevToolsWarningAndDetect();
    // ================= Detection Loop =================
    setInterval(() => {
        const before = new Date();
        debugger;

        const after = new Date();
        if (after - before > 100) {
            onHostile("debugger timing");
            if (!devToolsOpen) {
                devToolsOpen = true;
                showWarning();
            }
        } else {
            if (devToolsOpen) {
                devToolsOpen = false;
                hideWarning();
            }
        }
    }, 1000);
    //  ================= Optional Keyboard Block =================
    // Prevent F12 / Ctrl+Shift+I / Ctrl+Shift+C
    document.addEventListener("keydown", (e) => {
        if (
            e.key === "F12" ||
            (e.ctrlKey && e.shiftKey && ["I", "C", "J"].includes(e.key))
        )
            e.preventDefault();
    });
}

async function loadDevToolsWarningAndDetect() {
    try {
        const dialog = await loadDialog(
            "templates/devtools-warning.html",
            "devtoolsWarning"
        );
    } catch (err) {
        console.error(
            "Failed to load DevTools warning or start detection:",
            err
        );
    }
}

function onHostile(reason) {
    if (hostile) return;
    hostile = true;

    console.warn("Hostile detected:", reason);

    wipeContent();
}

function wipeContent() {
    const reader = document.getElementById("reader");
    if (!reader) return;

    reader.innerHTML = `
        <div class="w-full min-h-[80vh] flex items-center justify-center
                    bg-zinc-900 text-zinc-400 select-none">
            <div class="text-center">
                <p class="text-xl font-semibold">Content unavailable</p>
                <p class="text-sm opacity-60 mt-2">
                    Please refresh the page
                </p>
            </div>
        </div>
    `;
}

function showWarning() {
    const banner = document.getElementById("devtools-warning");
    banner.classList.remove("hidden");
    banner.classList.add("animate-bounce");
}

function hideWarning() {
    const banner = document.getElementById("devtools-warning");
    banner.classList.add("hidden");
    banner.classList.remove("animate-bounce");
}

function openDialog(dialog) {
    dialog.classList.remove("hidden");
    dialog.classList.add("flex");
}

function closeDialog(dialog) {
    dialog.classList.add("hidden");
    dialog.classList.remove("flex");
}
export function setupDialog({
    dialogId,
    onNegativePressed,
    onPositivePressed,
}) {
    const dialog = document.getElementById(dialogId);

    dialog.addEventListener("click", (e) => {
        if (e.target === dialog) closeDialog(dialog);
    });

    dialog.querySelector(".negative-btn")?.addEventListener("click", () => {
        onNegativePressed?.();
        closeDialog(dialog);
    });

    dialog
        .querySelector(".positive-btn")
        ?.addEventListener("click", async () => {
            await onPositivePressed?.();
            closeDialog(dialog);
        });

    return {
        open: () => openDialog(dialog),
        close: () => closeDialog(dialog),
    };
}
const savedTheme = localStorage.getItem("theme");
const html = document.documentElement;
if (savedTheme === "dark") {
    html.classList.add("dark");
}

export function isProduction() {
    return import.meta.env.PROD;
}
