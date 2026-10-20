# 🎙️ VoiceCraft Studio — AI Text to Speech & Voice Suite

A modern, production-grade Text to Speech web application built with **HTML5**, **Tailwind CSS**, **DaisyUI**, and **Vanilla JavaScript (ES6+)**. Powered natively by the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) with zero server latency and 100% client-side privacy.

---

## ✨ Real-World Features

- 🗣️ **System & Browser Voice Engine**:
  - Automatically loads and groups all available operating system and browser voices (Google, Microsoft, Apple, Natural).
  - Language filter dropdown to easily filter between English, Spanish, French, German, Hindi, Bengali, Japanese, and more.
- 🎵 **Acoustic Modulation Controls**:
  - **Reading Speed (Rate)**: `0.5x` to `2.0x` with instant quick-select buttons (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
  - **Voice Pitch**: `0.5` (Deep) to `1.5` (High).
  - **Volume Slider**: `0%` to `100%`.
- 🔤 **Real-Time Word Highlighting (Karaoke Mode)**:
  - Synchronized boundary tracking highlights each spoken word in real time with smooth automatic vertical scrolling.
- 📊 **Dynamic Audio Waveform Visualizer**:
  - HTML5 Canvas visualizer generates pulsing cyber-gradient frequency bars while speech is active.
- 🎤 **Speech-to-Text Voice Dictation**:
  - Built-in microphone recognition (`webkitSpeechRecognition`) transcribes spoken voice directly into the script editor.
- 💡 **One-Click Sample Presets**:
  - Quick-insert buttons for *Studio Pitch*, *Daily Motivation*, *AI & Tech News*, *Tongue Twisters*, and *Guided Breathing*.
- ⏱️ **Live Script Analytics**:
  - Real-time character count, word count, and estimated narration duration.
- 📜 **Recent Spoken Clips (History)**:
  - Spoken phrases are automatically preserved in `localStorage` with a single-click replay button.
- 📥 **Export & Sharing**:
  - Download speech script as a clean `.txt` file or copy to clipboard with instant toast notifications.
- ⌨️ **Keyboard Productivity Shortcuts**:
  - <kbd>Ctrl + Enter</kbd>: Convert to Speech / Play.
  - <kbd>Esc</kbd>: Stop / Cancel playback.
- 🔤 **Typography**:
  - Styled with **Google Fonts (Poppins)** with full weights (`300` to `900`).

---

## 🛠️ Tech Stack

- **Markup**: HTML5 (Semantic elements, `<canvas>`, `<dialog>`)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/) & [DaisyUI 4](https://daisyui.com/)
- **Typography**: [Google Fonts (Poppins)](https://fonts.google.com/specimen/Poppins)
- **Icons**: [Font Awesome 6](https://fontawesome.com/)
- **Audio APIs**: Web Speech API (`SpeechSynthesis`, `SpeechSynthesisUtterance`, `SpeechRecognition`)
- **Storage**: `localStorage` (Persistent history & voice preferences)

---

## 📂 Project Structure

```text
Text_to_Speech/
├── images/                 # Original application assets
│   ├── dropdown.png
│   └── play.png
├── index.html              # Main studio interface
├── script.js               # Audio synthesis, karaoke highlighter & dictation
├── style.css               # Cyber-glowing backgrounds & Poppins typography
└── README.md               # Documentation
```

---

## 🚀 How to Run Locally

Open `index.html` directly in your web browser, or launch a local server:

```powershell
cd C:\Users\Sojib\.gemini\antigravity\scratch\Text_to_Speech
python -m http.server 6000
```
Then visit `http://localhost:6000` in your browser.

---

&copy; 2026 VoiceCraft Studio. All rights reserved.
