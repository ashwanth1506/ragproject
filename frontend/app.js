const folderInput = document.querySelector("#folder-input");
const filesInput = document.querySelector("#files-input");
const dropZone = document.querySelector("#drop-zone");
const uploadProgress = document.querySelector("#upload-progress");
const uploadMessage = document.querySelector("#upload-message");
const fileList = document.querySelector("#file-list");
const fileCount = document.querySelector("#file-count");
const chatSection = document.querySelector("#chat-section");
const chatHistory = document.querySelector("#chat-history");
const questionForm = document.querySelector("#question-form");
const questionInput = document.querySelector("#question-input");
const toast = document.querySelector("#toast");
let toastTimer;

document.querySelector("#folder-button").addEventListener("click", () => folderInput.click());
document.querySelector("#files-button").addEventListener("click", () => filesInput.click());
folderInput.addEventListener("change", () => uploadFiles(folderInput.files));
filesInput.addEventListener("change", () => uploadFiles(filesInput.files));

for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
  });
}
dropZone.addEventListener("drop", (event) => {
  const files = Array.from(event.dataTransfer.files);
  for (const item of event.dataTransfer.items || []) {
    const entry = item.webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      showToast("For folder uploads, use the Choose a folder button.", true);
      return;
    }
  }
  uploadFiles(files);
});

async function uploadFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file, file.webkitRelativePath || file.name);
  }
  setUploading(true, `Reading ${files.length} file${files.length === 1 ? "" : "s"}…`);
  try {
    const result = await api("/api/upload", { method: "POST", body: formData });
    await refreshDocuments();
    chatSection.hidden = false;
    uploadMessage.textContent = `Indexed ${result.indexed} file${result.indexed === 1 ? "" : "s"}`;
    if (result.errors.length) {
      const details = result.errors.map((item) => `${item.file}: ${item.error}`).join("\n");
      showToast(`${result.indexed} indexed; ${result.errors.length} skipped. ${details}`, true, 6000);
    } else {
      showToast(result.message);
    }
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setUploading(false);
    folderInput.value = "";
    filesInput.value = "";
  }
}

function setUploading(loading, message = "") {
  uploadProgress.hidden = !loading;
  uploadMessage.textContent = message;
  document.querySelectorAll(".upload-actions button").forEach((button) => {
    button.disabled = loading;
  });
}

async function refreshDocuments() {
  const result = await api("/api/documents");
  fileCount.textContent = result.count;
  fileList.replaceChildren();
  if (!result.documents.length) {
    const empty = document.createElement("div");
    empty.className = "empty-files";
    empty.innerHTML = "Your uploaded files will<br>show up here.";
    fileList.append(empty);
    chatSection.hidden = true;
    return;
  }
  for (const documentInfo of result.documents) {
    const row = document.createElement("div");
    row.className = "file-item";
    const symbol = document.createElement("span");
    symbol.className = "file-symbol";
    symbol.textContent = "▤";
    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = documentInfo.name;
    name.title = `${documentInfo.name} · ${documentInfo.chunks} chunks`;
    row.append(symbol, name);
    fileList.append(row);
  }
}

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  appendMessage(question, "question");
  questionInput.value = "";
  const sendButton = questionForm.querySelector("button");
  sendButton.disabled = true;
  try {
    const result = await api("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    appendAnswer(result);
  } catch (error) {
    appendMessage(error.message, "answer message-error");
  } finally {
    sendButton.disabled = false;
    questionInput.focus();
  }
});

function appendMessage(text, className) {
  const message = document.createElement("div");
  message.className = `message ${className}`;
  message.textContent = text;
  chatHistory.append(message);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendAnswer(result) {
  const wrapper = document.createElement("div");
  wrapper.className = "message message-answer";
  const answer = document.createElement("div");
  answer.textContent = result.answer;
  wrapper.append(answer);
  if (result.sources.length) {
    const sources = document.createElement("div");
    sources.className = "sources";
    for (const [index, source] of result.sources.entries()) {
      const card = document.createElement("article");
      card.className = "source-card";
      const title = document.createElement("div");
      title.className = "source-title";
      title.textContent = `[${index + 1}] ${source.file} · chunk ${source.chunk} · ${Math.round(source.similarity * 100)}% match`;
      const text = document.createElement("div");
      text.className = "source-text";
      text.textContent = source.text;
      card.append(title, text);
      sources.append(card);
    }
    wrapper.append(sources);
  }
  chatHistory.append(wrapper);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

document.querySelector("#clear-button").addEventListener("click", async () => {
  if (!fileCount.textContent || fileCount.textContent === "0") {
    showToast("There are no indexed files to clear.");
    return;
  }
  if (!window.confirm("Remove all indexed documents from this workspace?")) return;
  try {
    const result = await api("/api/documents", { method: "DELETE" });
    await refreshDocuments();
    chatHistory.replaceChildren();
    showToast(result.message);
  } catch (error) {
    showToast(error.message, true);
  }
});

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  let result = {};
  if (body) {
    try {
      result = JSON.parse(body);
    } catch {
      if (!response.ok) {
        throw new Error(`Request failed (HTTP ${response.status}): ${body.slice(0, 300)}`);
      }
      throw new Error(`Server returned an invalid response (HTTP ${response.status}).`);
    }
  }
  if (!response.ok) {
    const detail = result && typeof result === "object" ? result.detail : null;
    const message = typeof detail === "string"
      ? detail
      : `Request failed (HTTP ${response.status} ${response.statusText}).`;
    throw new Error(message);
  }
  return result;
}

function showToast(message, isError = false, duration = 3500) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), duration);
}

refreshDocuments().catch((error) => showToast(error.message, true));
