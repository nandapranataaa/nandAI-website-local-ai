const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themaToggle = document.querySelector("#theme-toggle-btn");

const API_KEY = "AIzaSyAq5bTrLkgmWz_K7tDS4-Wbu2PPlYQ7vac"; //replace your API Key , Open your Google AI Studio//
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const chatHistory = [];
const userData = { message: "", file: {} };

// Tambahan: daftar sapaan yang dikenali
const greetingList = ["hello", "hallo", "helo", "hai", "hi"];

// Function to create message elements
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Simulate typing effect for bot response
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;
    typingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
        }
    }, 40);
};

// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv, userMessage) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    const userParts = [{ text: userMessage }];
    if (userData.file?.data) {
        userParts.push({
            inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file)
        });
    }
    chatHistory.push({ role: "user", parts: userParts });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        typingEffect(responseText, textElement, botMsgDiv);
        chatHistory.push({ role: "model", parts: [{ text: responseText }] });
        console.log(chatHistory);
    } catch (error) {
        textElement.style.color = "#d62939";
        console.error("Error fetching response:", error.message);
        textElement.textContent = "Maaf, terjadi kesalahan saat memproses permintaan.";
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
    } finally {
        userData.file = {};
    }
};

// Handle form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;

    // Tambahan: Cek jika pesan adalah sapaan
    if (greetingList.includes(userMessage.toLowerCase())) {
        const userMsgDiv = createMsgElement(`<p class="message-text">${userMessage}</p>`, "user-message");
        chatsContainer.appendChild(userMsgDiv);

        const botMsgHTML = '<img src="avatar.svg" class="avatar"><p class="message-text">Hai, Saya asisten berbasis kecerdasan buatan yang dikembangkan oleh Masreda Nanda Pranata</p>';
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message");
        chatsContainer.appendChild(botMsgDiv);

        promptInput.value = "";
        scrollToBottom();
        return;
    }

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    const userMsgHTML = `
    <p class="message-text"></p> 
    ${userData.file.data ? 
        (userData.file.isImage ? 
            `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` :
            `<p class="file-attachment"><span class="material-symbols-outlined">description</span>${userData.file.fileName}</p>`
        ) : ""
    }
`;
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        const botMsgHTML = '<img src="avatar.svg" class="avatar"><p class="message-text">Sabar Boss....</p>';
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv, userMessage);
    }, 600);
};

// File input change event
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64string = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
        userData.file = {
            fileName: file.name,
            data: base64string,
            mime_type: file.type,
            isImage
        };
    };
});

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

});
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    const loadingBotMsg = chatsContainer.querySelector(".bot-message.loading");
    if (loadingBotMsg) loadingBotMsg.classList.remove("loading");
    document.body.classList.remove("bot-responding");
});

document.querySelectorAll(".suggestion-item").forEach(item =>{
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
}); 
    
});

document.querySelector("#delete_chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("bot-responding", "chats-active");
});
themaToggle.addEventListener("click", () => {
  const islightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("theme", islightTheme ? "dark_mode" : "light_mode");
  themaToggle.textContent = islightTheme ? "dark_mode" : "light_mode"; 
});

const islightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", islightTheme);
themaToggle.textContent = islightTheme ? "dark_mode" : "light_mode"; 

// Attach file input when the button is clicked
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

// Listen for form submission
promptForm.addEventListener("submit", handleFormSubmit);
