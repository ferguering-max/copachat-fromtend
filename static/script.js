const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messages = document.querySelector("#messages");
const sendButton = document.querySelector("#send-button");
const clearButton = document.querySelector("#clear-chat");
const errorBanner = document.querySelector("#error-banner");
const charCount = document.querySelector("#char-count");

let history = [];
let busy = false;

function timeNow() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function addMessage(role, text, options = {}) {
  const article = document.createElement("article");
  article.className = `message ${role === "user" ? "user-message" : "bot-message"}`;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "🙂" : "🏆";
  avatar.setAttribute("aria-hidden", "true");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (options.typing) {
    const typing = document.createElement("div");
    typing.className = "typing";
    typing.setAttribute("aria-label", "CopaBot está respondendo");
    for (let i = 0; i < 3; i++) typing.appendChild(document.createElement("span"));
    bubble.appendChild(typing);
  } else {
    // textContent evita interpretar respostas da IA como HTML.
    const paragraphs = String(text).split(/\n{2,}/);
    for (const paragraph of paragraphs) {
      const p = document.createElement("p");
      p.textContent = paragraph;
      bubble.appendChild(p);
    }
    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = options.time || timeNow();
    bubble.appendChild(time);
  }

  article.append(avatar, bubble);
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}
function hideError() {
  errorBanner.hidden = true;
  errorBanner.textContent = "";
}
function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  input.disabled = value;
  sendButton.querySelector("span:first-child").textContent = value ? "Enviando" : "Enviar";
}

async function sendMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message || busy) return;
  hideError();
  addMessage("user", message);
  history.push({ role: "user", content: message });
  input.value = "";
  updateCount();
  autoResize();
  setBusy(true);
  const typing = addMessage("assistant", "", { typing: true });

  try {
    const response = await fetch(`${(window.COPABOT_CONFIG && window.COPABOT_CONFIG.API_BASE_URL || "").replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history.slice(0, -1) })
    });
    const data = await response.json().catch(() => ({}));
    typing.remove();

    if (!response.ok) {
      showError(data.error || `Não foi possível obter uma resposta (HTTP ${response.status}).`);
      return;
    }
    const reply = data.reply || "Não recebi uma resposta. Tente novamente.";
    addMessage("assistant", reply);
    // Mensagens bloqueadas também entram no histórico visual, mas não precisam ir à IA.
    history.push({ role: "assistant", content: reply });
  } catch (error) {
    typing.remove();
    showError("Não foi possível conectar ao servidor. Confirme se o Flask está em execução e tente novamente.");
  } finally {
    setBusy(false);
    input.focus();
  }
}

function updateCount() {
  charCount.textContent = `${input.value.length}/2000`;
}
function autoResize() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});
input.addEventListener("input", () => { updateCount(); autoResize(); });
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});
clearButton.addEventListener("click", () => {
  if (busy) return;
  history = [];
  messages.replaceChildren();
  hideError();
  addMessage("assistant", "Conversa reiniciada! ⚽ Pergunte sobre campeões, seleções, jogos históricos ou curiosidades da Copa do Mundo.");
  input.focus();
});
updateCount();
