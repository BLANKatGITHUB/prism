const form = document.querySelector("form");
const subBtn = document.querySelector("#submit-button");
const result = document.querySelector(".output");
const speakBtn = document.querySelector("#speak");
const file = document.querySelector("#input-document");
const inputElement = document.querySelector("textarea");

subBtn.addEventListener("click", async (event) => {
  event.preventDefault();
  subBtn.disabled = true;
  speakBtn.style.display = "none";

  const inputText = form["input-text"].value || "";
  const inputFileData = form["input-document"]?.files[0];

  if (!inputText.trim() && !inputFileData) {
    alert("Please provide input text or upload a file.");
    subBtn.disabled = false;
    return;
  }

  if (
    inputFileData &&
    !["application/pdf", "image/png", "image/jpeg"].includes(inputFileData.type)
  ) {
    alert("Please upload a valid PDF or image file (PNG/JPEG).");
    subBtn.disabled = false;
    return;
  }

  try {
    result.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i><span>\t Loading...</span>';
    const formData = new FormData();
    formData.append("input-text", inputText);

    let endpoint = "/generate_text_output";

    if (inputFileData) {
      formData.append("input-file", inputFileData);
      if (["image/jpeg", "image/png"].includes(inputFileData.type)) {
        endpoint = "/generate_img_output";
      } else if (inputFileData.type === "application/pdf") {
        endpoint = "/generate_pdf_output";
      }
    }

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `Server responded with status: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    document.getElementById("file-name").innerHTML = ""; 
    if (data.content) {
      result.innerHTML = data.content;
      setTimeout(() => {
        speakBtn.style.display = "block";
      }, 1000);
    } else {
      throw new Error("Invalid response format from server.");
    }
  } catch (error) {
    console.error("Error during submission:", error);
    result.innerHTML = `Error: ${error.message}`;
  } finally {
    subBtn.disabled = false;
  }
});

speakBtn.addEventListener("click", async () => {
  const synth = window.speechSynthesis;
  const audioElements = result.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li");
  if (!synth.speaking) {
    for (let i = 0; i < audioElements.length; i++) {
      const element = audioElements[i];
      const speakingText = new SpeechSynthesisUtterance(element.innerText);
      speakingText.lang = "en-US";
      speakingText.rate = 0.85;
      speakingText.pitch = 1;

      await new Promise((resolve, reject) => {
        speakingText.onend = () => {
          element.classList.remove("speaking");
          resolve();
        };
        speakingText.onerror = (event) => {
          console.error("Speech synthesis error:", event.error);
          reject(event.error);
        };
        speakingText.onstart = () => {
          element.classList.add("speaking");
        };
        synth.speak(speakingText);
      });
    }
  } else {
    synth.cancel();
  }
});

// Stop speech synthesis when the page is unloaded
window.addEventListener("beforeunload", () => {
  const synth = window.speechSynthesis;
  if (synth.speaking) {
    synth.cancel();
  }
});

inputElement.addEventListener("input", () => {
  inputElement.style.overflowX = "hidden";
  inputElement.style.overflowX = "scroll";
  inputElement.rows = "3";
});

const FONT_FAMILY_KEY = "prism-fontFamily";
const WORD_SPACING_KEY = "prism-wordSpacing";
const LETTER_SPACING_KEY = "prism-letterSpacing";

function applyAndSaveStyle(prop, value, unit = "") {
  const bodyStyle = document.body.style;
  let current = parseFloat(bodyStyle[prop]) || 0;

  if (!localStorage.getItem(WORD_SPACING_KEY) && prop === "word-spacing") {
    const computedStyle = getComputedStyle(document.body);
    current = parseFloat(computedStyle.wordSpacing);
  }
  if (!localStorage.getItem(LETTER_SPACING_KEY) && prop === "letter-spacing") {
    const computedStyle = getComputedStyle(document.body);
    current = parseFloat(computedStyle.letterSpacing);
  }

  const updated = +(current + value).toFixed(2);
  const finalValue = updated + unit;
  document.body.style.setProperty(prop, finalValue, "important");

  if (prop === "word-spacing") {
    localStorage.setItem(WORD_SPACING_KEY, finalValue);
  } else if (prop === "letter-spacing") {
    localStorage.setItem(LETTER_SPACING_KEY, finalValue);
  }
}

// Function to load settings from localStorage
function loadSettings() {
  const savedFont = localStorage.getItem(FONT_FAMILY_KEY);
  const savedWordSpacing = localStorage.getItem(WORD_SPACING_KEY);
  const savedLetterSpacing = localStorage.getItem(LETTER_SPACING_KEY);

  if (savedFont) {
    document.body.style.fontFamily = savedFont;
    fontSelect.value = savedFont;
  }

  if (savedWordSpacing) {
    document.body.style.setProperty(
      "word-spacing",
      savedWordSpacing,
      "important"
    );
  }

  if (savedLetterSpacing) {
    document.body.style.setProperty(
      "letter-spacing",
      savedLetterSpacing,
      "important"
    );
  }
}

document.addEventListener("DOMContentLoaded", loadSettings);

document
  .getElementById("word-increase")
  .addEventListener("click", () => applyAndSaveStyle("word-spacing", 1, "px"));
document
  .getElementById("word-decrease")
  .addEventListener("click", () => applyAndSaveStyle("word-spacing", -1, "px"));

document
  .getElementById("letter-increase")
  .addEventListener("click", () =>
    applyAndSaveStyle("letter-spacing", 0.1, "px")
  );
document
  .getElementById("letter-decrease")
  .addEventListener("click", () =>
    applyAndSaveStyle("letter-spacing", -0.1, "px")
  );

const fontSelect = document.getElementById("font-select");
const resetSettingsBtn = document.getElementById("reset-settings"); 

fontSelect.addEventListener("change", () => {
  const selectedFont = fontSelect.value;
  document.body.style.fontFamily = selectedFont;
  localStorage.setItem(FONT_FAMILY_KEY, selectedFont); // Save font
});


resetSettingsBtn.addEventListener("click", () => {
  const defaultFontFamily =
    '"OpenDyslexic", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
  const defaultWordSpacing = "3.5px";
  const defaultLetterSpacing = "1.35px"; 


  document.body.style.fontFamily = defaultFontFamily;
  document.body.style.setProperty(
    "word-spacing",
    defaultWordSpacing,
    "important"
  );
  document.body.style.setProperty(
    "letter-spacing",
    defaultLetterSpacing,
    "important"
  );


  fontSelect.value = defaultFontFamily; 

  localStorage.removeItem(FONT_FAMILY_KEY);
  localStorage.removeItem(WORD_SPACING_KEY);
  localStorage.removeItem(LETTER_SPACING_KEY);



});


file.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    document.getElementById("file-name").innerHTML = file.name;
  }
});
