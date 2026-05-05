const socket = io();
const username = localStorage.getItem("user") || "User";

// 🔴 YOUR HF ENDPOINT
const MODEL_API = "https://JMJ10-MemeShield-ML-Model-API.hf.space/predict";

// EMOJIS
const emojis = ["😀","😂","😍","🔥","😭","😡","😎","🤯","🥶","🤡"];

document.addEventListener("DOMContentLoaded", () => {
    setupEmojiPicker();

    socket.emit("user-join", username);
});

// SEND TEXT
function sendMessage(){
    const input = document.getElementById("message-input");
    const msg = input.value.trim();
    if(!msg) return;

    socket.emit("message", {message: msg});
    input.value = "";
}

// RECEIVE MESSAGE
socket.on("message", (data)=>{
    renderMessage(data);
});

// RENDER MESSAGE
function renderMessage(data){
    const chat = document.getElementById("chat-messages");

    const div = document.createElement("div");
    div.className = "message";

    if(data.type === "image"){
        div.innerHTML = `
            <img src="${data.imageUrl}" class="message-image"/>

            <div class="prediction-label ${data.analysis.label}">
                ${data.analysis.label}
            </div>

            ${data.analysis.label !== "not_offensive" ? `
                <div class="content-warning">
                    <strong>⚠ Offensive</strong>
                    <div>${data.analysis.explanation}</div>
                </div>
            ` : ""}
        `;
    } else {
        div.textContent = data.username + ": " + data.message;
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// IMAGE UPLOAD
document.getElementById("image-input").addEventListener("change", async (e)=>{
    const file = e.target.files[0];
    if(!file) return;

    const form = new FormData();
    form.append("image", file);

    const uploadRes = await fetch("/upload", {
        method:"POST",
        body:form
    });

    const uploadData = await uploadRes.json();

    socket.emit("image-upload", {
        imageUrl: uploadData.imageUrl
    });
});

// EMOJI PICKER
function setupEmojiPicker(){
    const picker = document.getElementById("emoji-picker");

    emojis.forEach(e=>{
        const span = document.createElement("span");
        span.textContent = e;
        span.onclick = ()=>{
            document.getElementById("message-input").value += e;
        };
        picker.appendChild(span);
    });

    document.getElementById("emoji-btn").onclick = ()=>{
        picker.classList.toggle("hidden");
    };
}