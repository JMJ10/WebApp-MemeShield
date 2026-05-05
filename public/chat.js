/* ============================================================
   MemeShield — chat.js
   ============================================================ */

const socket   = io();
// Fix: server stores "username", not "user"
const username = localStorage.getItem("username") || "User";

const EMOJIS = ["😀","😂","😍","🔥","😭","😡","😎","🤯","🥶","🤡","👍","💀","🫡","💯","🎉"];

/* ─── DOM refs ─── */
const msgList  = document.getElementById("chat-messages");
const msgInput = document.getElementById("message-input");
const statusEl = document.getElementById("connection-status");
const emojiPkr = document.getElementById("emoji-picker");

/* ─── Auth guard ─── */
if (!localStorage.getItem("username")) {
  window.location.href = "/login.html";
}

/* ─── Socket lifecycle ─── */
socket.on("connect", () => {
  socket.emit("user-join", username);
  setStatus(true);
  appendSystem("🛡 MemeShield is active — AI moderation enabled");
});

socket.on("disconnect", () => setStatus(false));

function setStatus(online) {
  statusEl.textContent = online ? "Online" : "Offline";
  statusEl.className = "status-indicator " + (online ? "online" : "offline");
}

/* ─── Receive ─── */
socket.on("message", renderMessage);

/* ─── Render ─── */
function renderMessage(data) {
  const wrap = document.createElement("div");

  if (data.type === "image") {
    const isOffensive = data.analysis && data.analysis.label !== "not_offensive";
    wrap.className = "message other";

    const meta = `
      <div class="msg-meta">
        <span class="msg-username">${escHtml(data.username || "User")}</span>
        <span class="msg-time">${timeNow()}</span>
      </div>`;

    const imgHtml = `
    <div class="message-image-wrap">
        <img src="${data.imageUrl}" class="message-image" alt="shared meme" />
    
        <span class="prediction-label ${data.analysis?.label || ''}">
        ${formatLabel(data.analysis?.label)}
        </span>

        ${isOffensive ? `
        <div class="content-warning">
            <strong>⚠ Content Warning</strong>

            ${data.analysis?.explanation ? `
            <div class="cw-section">
                <div class="cw-title">Explanation</div>
                <div class="cw-text">${escHtml(data.analysis.explanation)}</div>
            </div>` : ""}

            ${data.analysis?.categories?.length ? `
            <div class="cw-section">
                <div class="cw-title">Categories</div>
                <div class="cw-tags">
                ${data.analysis.categories.map(c => `<span class="cw-tag">${escHtml(c)}</span>`).join("")}
                </div>
            </div>` : ""}

            ${data.analysis?.laws?.length ? `
            <div class="cw-section">
                <div class="cw-title">Relevant Policies</div>
                <ul class="cw-laws">
                ${data.analysis.laws.map(l => `<li>${escHtml(l)}</li>`).join("")}
                </ul>
            </div>` : ""}

        </div>
    ` : ""}
    </div>`;

    wrap.innerHTML = meta + imgHtml;

  } else {
    const isMine = data.username === username;
    wrap.className = "message " + (isMine ? "own" : "other");
    wrap.innerHTML = `
      <div class="msg-meta">
        <span class="msg-username">${escHtml(data.username)}</span>
        <span class="msg-time">${timeNow()}</span>
      </div>
      <div class="msg-bubble">${escHtml(data.message)}</div>`;
  }

  msgList.appendChild(wrap);
  msgList.scrollTop = msgList.scrollHeight;
}

function appendSystem(text) {
  const wrap = document.createElement("div");
  wrap.className = "message system";
  wrap.innerHTML = `<div class="msg-bubble">${text}</div>`;
  msgList.appendChild(wrap);
  msgList.scrollTop = msgList.scrollHeight;
}

/* ─── Send text ─── */
function sendMessage() {
  const msg = msgInput.value.trim();
  if (!msg) return;
  socket.emit("message", { message: msg });
  msgInput.value = "";
}

msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

/* ─── Image upload ─── */
document.getElementById("image-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Show uploading indicator
  const indicator = document.createElement("div");
  indicator.className = "uploading-indicator";
  indicator.innerHTML = `<div class="spinner"></div><span>Uploading &amp; analyzing meme…</span>`;
  msgList.appendChild(indicator);
  msgList.scrollTop = msgList.scrollHeight;

  try {
    const form = new FormData();
    form.append("image", file);

    const uploadRes  = await fetch("/upload", { method: "POST", body: form });
    const uploadData = await uploadRes.json();

    socket.emit("image-upload", { imageUrl: uploadData.imageUrl, username });
  } catch (err) {
    indicator.innerHTML = `<span>⚠ Upload failed. Please try again.</span>`;
  } finally {
    // Remove indicator after a moment (server will broadcast the real result)
    setTimeout(() => indicator.remove(), 3000);
  }

  // Reset file input so same file can be re-selected
  e.target.value = "";
});

/* ─── Emoji picker ─── */
(function setupEmojiPicker() {
  const grid = document.getElementById("emoji-grid");
  EMOJIS.forEach(em => {
    const span = document.createElement("span");
    span.textContent = em;
    span.onclick = () => { msgInput.value += em; msgInput.focus(); };
    grid.appendChild(span);
  });

  document.getElementById("close-emoji").onclick = (e) => {
    e.stopPropagation();
    emojiPkr.classList.add("hidden");
  };
  document.addEventListener("click", () => emojiPkr.classList.add("hidden"));
})();
document.getElementById("image-btn").addEventListener("click", () => {
  document.getElementById("image-input").click();
});

document.getElementById("send-btn").addEventListener("click", sendMessage);
/* ─── Helpers ─── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLabel(label) {
  if (!label) return "Unknown";
  return label.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const emojiBtn = document.getElementById("emoji-btn");

emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent immediate close
  emojiPkr.classList.toggle("hidden");
});