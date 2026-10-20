/**
 * VoiceCraft Studio — AI Text to Speech & Voice Suite
 * Production-grade Web Speech API implementation with Word Highlighting,
 * Voice Recognition, Waveform Visualizer, and Advanced Controls.
 */

// --- Global State ---
const studioState = {
    voices: [],
    selectedVoiceIndex: 0,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    isSpeaking: false,
    isPaused: false,
    recognitionActive: false,
    recognitionInstance: null,
    history: JSON.parse(localStorage.getItem('voicecraft_history') || '[]'),
    readAlongMode: true,
    animationFrameId: null,
};

// --- Presets Data ---
const PRESETS = {
    motivation: "Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle. Every morning brings new potential, so step forward with unwavering confidence.",
    tech: "Artificial intelligence and quantum computing are revolutionizing modern engineering. From generative models to neural interfaces, the horizon of technology is expanding at an exponential velocity.",
    twister: "How much wood would a woodchuck chuck if a woodchuck could chuck wood? He would chuck as much as he could, and chuck as much wood as a woodchuck would if a woodchuck could chuck wood.",
    meditation: "Take a deep breath in through your nose. Feel your chest expand with calm, quiet energy. Hold for three seconds, and exhale slowly through your mouth, letting go of all tension.",
    pitch: "Welcome to VoiceCraft Studio! We transform raw written text into studio-grade vocal experiences with customizable speed, acoustic pitch modulation, and real-time synchronized karaoke tracking."
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initVoices();
    initSpeechRecognition();
    initWaveformVisualizer();
    setupEventListeners();
    setupModernDialogDismissal();
    renderHistory();
    updateTextStats();
});

// --- Voice Synthesis Engine ---
function initVoices() {
    function populateVoiceList() {
        if (!('speechSynthesis' in window)) {
            showToast('Speech Synthesis is not supported in this browser.', 'error', 'fa-triangle-exclamation');
            return;
        }

        studioState.voices = window.speechSynthesis.getVoices();
        const select = document.getElementById('voiceSelect');
        const langFilter = document.getElementById('languageFilter');
        if (!select) return;

        if (studioState.voices.length === 0) return;

        // Populate language filter if empty
        if (langFilter && langFilter.options.length <= 1) {
            const languages = new Set();
            studioState.voices.forEach(v => {
                const langCode = v.lang.split('-')[0].toLowerCase();
                languages.add(langCode);
            });

            Array.from(languages).sort().forEach(lang => {
                const opt = document.createElement('option');
                opt.value = lang;
                opt.textContent = getLanguageName(lang);
                langFilter.appendChild(opt);
            });
        }

        renderVoiceOptions();
    }

    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }
}

function renderVoiceOptions(filterLang = 'all') {
    const select = document.getElementById('voiceSelect');
    if (!select) return;

    select.innerHTML = '';
    const filtered = studioState.voices.map((v, i) => ({ voice: v, originalIndex: i }))
        .filter(item => {
            if (filterLang === 'all') return true;
            return item.voice.lang.toLowerCase().startsWith(filterLang.toLowerCase());
        });

    if (filtered.length === 0) {
        select.innerHTML = `<option value="">No voices found for this filter</option>`;
        return;
    }

    filtered.forEach(item => {
        const option = document.createElement('option');
        option.value = item.originalIndex;
        const flag = getFlagEmoji(item.voice.lang);
        const isNatural = item.voice.name.includes('Natural') || item.voice.name.includes('Google') || item.voice.name.includes('Premium');
        option.textContent = `${flag} ${item.voice.name} (${item.voice.lang}) ${isNatural ? '★' : ''}`;
        if (item.originalIndex === studioState.selectedVoiceIndex) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    const voiceCountEl = document.getElementById('availableVoiceCount');
    if (voiceCountEl) {
        voiceCountEl.textContent = `${studioState.voices.length} System Voices Ready`;
    }
}

// --- Text-to-Speech Playback ---
function speakText() {
    const textInput = document.getElementById('textInput');
    const text = textInput ? textInput.value.trim() : '';

    if (!text) {
        showToast('Please enter or paste some text to speak!', 'warning', 'fa-pen-to-square');
        if (textInput) textInput.focus();
        return;
    }

    // If currently paused, resume instead of restart
    if (studioState.isPaused && window.speechSynthesis.paused) {
        resumeSpeech();
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedIndex = parseInt(document.getElementById('voiceSelect').value, 10);
    if (!isNaN(selectedIndex) && studioState.voices[selectedIndex]) {
        utterance.voice = studioState.voices[selectedIndex];
        studioState.selectedVoiceIndex = selectedIndex;
    }

    utterance.rate = studioState.rate;
    utterance.pitch = studioState.pitch;
    utterance.volume = studioState.volume;

    // Prepare Read-Along Karaoke Mode
    prepareKaraokeText(text);

    // Event Listeners on Utterance
    utterance.onstart = () => {
        studioState.isSpeaking = true;
        studioState.isPaused = false;
        updateControlsUI();
        startVisualizer();
        showToast('Speech started...', 'info', 'fa-volume-high');
    };

    utterance.onpause = () => {
        studioState.isPaused = true;
        updateControlsUI();
        stopVisualizer();
    };

    utterance.onresume = () => {
        studioState.isPaused = false;
        updateControlsUI();
        startVisualizer();
    };

    utterance.onboundary = (event) => {
        if (event.name === 'word') {
            highlightKaraokeWord(event.charIndex, event.charLength || 6);
        }
    };

    utterance.onend = () => {
        studioState.isSpeaking = false;
        studioState.isPaused = false;
        clearKaraokeHighlights();
        updateControlsUI();
        stopVisualizer();
        saveToHistory(text);
        showToast('Finished speaking!', 'success', 'fa-circle-check');
    };

    utterance.onerror = (e) => {
        console.warn('Speech error:', e);
        studioState.isSpeaking = false;
        studioState.isPaused = false;
        clearKaraokeHighlights();
        updateControlsUI();
        stopVisualizer();
    };

    window.speechSynthesis.speak(utterance);
}

function pauseSpeech() {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        studioState.isPaused = true;
        updateControlsUI();
        stopVisualizer();
        showToast('Speech paused', 'info', 'fa-pause');
    }
}

function resumeSpeech() {
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        studioState.isPaused = false;
        updateControlsUI();
        startVisualizer();
        showToast('Speech resumed', 'info', 'fa-play');
    }
}

function stopSpeech() {
    window.speechSynthesis.cancel();
    studioState.isSpeaking = false;
    studioState.isPaused = false;
    clearKaraokeHighlights();
    updateControlsUI();
    stopVisualizer();
    showToast('Speech stopped', 'info', 'fa-stop');
}

function updateControlsUI() {
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusPill = document.getElementById('speechStatusPill');

    if (studioState.isSpeaking && !studioState.isPaused) {
        if (playBtn) playBtn.classList.add('hidden');
        if (pauseBtn) pauseBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.disabled = false;
        if (statusPill) {
            statusPill.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Speaking...`;
            statusPill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5';
        }
    } else if (studioState.isPaused) {
        if (pauseBtn) pauseBtn.classList.add('hidden');
        if (playBtn) {
            playBtn.classList.remove('hidden');
            playBtn.querySelector('span').textContent = 'Resume';
        }
        if (stopBtn) stopBtn.disabled = false;
        if (statusPill) {
            statusPill.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> Paused`;
            statusPill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5';
        }
    } else {
        if (pauseBtn) pauseBtn.classList.add('hidden');
        if (playBtn) {
            playBtn.classList.remove('hidden');
            playBtn.querySelector('span').textContent = 'Convert to Speech';
        }
        if (stopBtn) stopBtn.disabled = true;
        if (statusPill) {
            statusPill.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span> Ready`;
            statusPill.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70 border border-white/10 flex items-center gap-1.5';
        }
    }
}

// --- Real-Time Word Highlighting (Karaoke) ---
function prepareKaraokeText(text) {
    const karaokeContainer = document.getElementById('karaokeDisplay');
    const textInput = document.getElementById('textInput');
    if (!karaokeContainer) return;

    if (!studioState.readAlongMode) return;

    // Split text into tokens keeping spaces
    const words = text.split(/(\s+)/);
    let charOffset = 0;

    karaokeContainer.innerHTML = words.map(chunk => {
        if (/^\s+$/.test(chunk)) {
            charOffset += chunk.length;
            return chunk;
        }
        const start = charOffset;
        const end = start + chunk.length;
        charOffset += chunk.length;
        return `<span class="karaoke-word transition-colors duration-150 rounded px-0.5" data-start="${start}" data-end="${end}">${escapeHtml(chunk)}</span>`;
    }).join('');

    karaokeContainer.classList.remove('hidden');
    if (textInput) textInput.classList.add('hidden');
}

function highlightKaraokeWord(charIndex, charLength) {
    const words = document.querySelectorAll('.karaoke-word');
    let activeWord = null;

    words.forEach(w => {
        const start = parseInt(w.getAttribute('data-start'), 10);
        const end = parseInt(w.getAttribute('data-end'), 10);
        if (charIndex >= start && charIndex <= end) {
            w.classList.add('bg-gradient-to-r', 'from-amber-400', 'to-orange-500', 'text-slate-950', 'font-bold', 'shadow-sm', 'scale-105');
            activeWord = w;
        } else {
            w.classList.remove('bg-gradient-to-r', 'from-amber-400', 'to-orange-500', 'text-slate-950', 'font-bold', 'shadow-sm', 'scale-105');
        }
    });

    if (activeWord) {
        activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function clearKaraokeHighlights() {
    const karaokeContainer = document.getElementById('karaokeDisplay');
    const textInput = document.getElementById('textInput');

    if (karaokeContainer) karaokeContainer.classList.add('hidden');
    if (textInput) textInput.classList.remove('hidden');
}

// --- Audio Waveform Visualizer ---
function initWaveformVisualizer() {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth || 320;
    canvas.height = 48;
    drawStaticBars(ctx, canvas);
}

function drawStaticBars(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barsCount = 36;
    const barWidth = canvas.width / barsCount - 3;

    for (let i = 0; i < barsCount; i++) {
        const x = i * (barWidth + 3);
        const height = 4;
        const y = (canvas.height - height) / 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x, y, barWidth, height);
    }
}

function startVisualizer() {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const barsCount = 36;
    const barWidth = canvas.width / barsCount - 3;
    let phase = 0;

    function animate() {
        if (!studioState.isSpeaking || studioState.isPaused) {
            drawStaticBars(ctx, canvas);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        phase += 0.15;

        for (let i = 0; i < barsCount; i++) {
            const x = i * (barWidth + 3);
            const dynamicHeight = Math.abs(Math.sin(phase + i * 0.3)) * (canvas.height * 0.8) + 6;
            const y = (canvas.height - dynamicHeight) / 2;

            const gradient = ctx.createLinearGradient(0, y, 0, y + dynamicHeight);
            gradient.addColorStop(0, '#00f0ff');
            gradient.addColorStop(1, '#ff00cc');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, dynamicHeight, 3);
            ctx.fill();
        }

        studioState.animationFrameId = requestAnimationFrame(animate);
    }

    cancelAnimationFrame(studioState.animationFrameId);
    animate();
}

function stopVisualizer() {
    cancelAnimationFrame(studioState.animationFrameId);
    const canvas = document.getElementById('waveformCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        drawStaticBars(ctx, canvas);
    }
}

// --- Speech Recognition (Voice Dictation) ---
function initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
        const micBtn = document.getElementById('dictateMicBtn');
        if (micBtn) {
            micBtn.title = "Speech recognition not supported in this browser";
            micBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        return;
    }

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        studioState.recognitionActive = true;
        const micBtn = document.getElementById('dictateMicBtn');
        if (micBtn) {
            micBtn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
            micBtn.classList.remove('bg-white/10', 'text-white/80');
        }
        showToast('Listening... Speak into your microphone', 'info', 'fa-microphone');
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }

        const textInput = document.getElementById('textInput');
        if (textInput && transcript) {
            textInput.value = (textInput.value + ' ' + transcript).trim();
            updateTextStats();
        }
    };

    recognition.onerror = (event) => {
        console.warn('Speech rec error:', event.error);
        stopDictation();
    };

    recognition.onend = () => {
        stopDictation();
    };

    studioState.recognitionInstance = recognition;
}

function toggleDictation() {
    if (!studioState.recognitionInstance) {
        showToast('Speech dictation is only supported on Chrome, Edge, and modern browsers.', 'warning', 'fa-microphone-slash');
        return;
    }

    if (studioState.recognitionActive) {
        studioState.recognitionInstance.stop();
        stopDictation();
    } else {
        try {
            studioState.recognitionInstance.start();
        } catch (e) {
            console.error(e);
        }
    }
}

function stopDictation() {
    studioState.recognitionActive = false;
    const micBtn = document.getElementById('dictateMicBtn');
    if (micBtn) {
        micBtn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
        micBtn.classList.add('bg-white/10', 'text-white/80');
    }
}

// --- Text Stats Calculation ---
function updateTextStats() {
    const textInput = document.getElementById('textInput');
    const text = textInput ? textInput.value : '';

    const charCount = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    // Average speech rate is ~130 words per minute at 1.0x speed
    const wordsPerMinute = 130 * studioState.rate;
    const minutes = words / wordsPerMinute;
    const seconds = Math.round(minutes * 60);

    const charEl = document.getElementById('charCountDisplay');
    const wordEl = document.getElementById('wordCountDisplay');
    const timeEl = document.getElementById('estTimeDisplay');

    if (charEl) charEl.textContent = `${charCount} characters`;
    if (wordEl) wordEl.textContent = `${words} words`;
    if (timeEl) timeEl.textContent = `~${seconds}s read`;
}

// --- Preset Insertions ---
function insertPreset(key) {
    const textInput = document.getElementById('textInput');
    if (!textInput || !PRESETS[key]) return;

    textInput.value = PRESETS[key];
    updateTextStats();
    showToast(`Loaded "${key.toUpperCase()}" sample text`, 'success', 'fa-quote-left');
}

function clearText() {
    const textInput = document.getElementById('textInput');
    if (!textInput) return;

    if (textInput.value.trim() && confirm('Clear all current text?')) {
        textInput.value = '';
        updateTextStats();
        stopSpeech();
        showToast('Text cleared', 'info', 'fa-eraser');
    }
}

function copyText() {
    const textInput = document.getElementById('textInput');
    if (!textInput || !textInput.value.trim()) {
        showToast('Nothing to copy!', 'warning', 'fa-copy');
        return;
    }

    navigator.clipboard.writeText(textInput.value.trim())
        .then(() => showToast('Copied text to clipboard!', 'success', 'fa-copy'))
        .catch(() => showToast('Failed to copy', 'error', 'fa-triangle-exclamation'));
}

function exportTextAsFile() {
    const textInput = document.getElementById('textInput');
    if (!textInput || !textInput.value.trim()) {
        showToast('No text available to export', 'warning', 'fa-file-arrow-down');
        return;
    }

    const blob = new Blob([textInput.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voicecraft-speech-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported as .txt file!', 'success', 'fa-download');
}

// --- History & Saved Clips ---
function saveToHistory(text) {
    if (!text || text.length < 5) return;
    studioState.history = studioState.history.filter(h => h.text !== text);
    studioState.history.unshift({
        text,
        date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });
    if (studioState.history.length > 8) studioState.history.pop();
    localStorage.setItem('voicecraft_history', JSON.stringify(studioState.history));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('historyListContainer');
    if (!container) return;

    if (studioState.history.length === 0) {
        container.innerHTML = `
            <div class="py-6 text-center text-white/40 text-xs">
                No past synthesized clips. Click "Convert to Speech" to start speaking.
            </div>
        `;
        return;
    }

    container.innerHTML = studioState.history.map((item, idx) => `
        <div class="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-3 text-left transition group">
            <div class="flex-grow min-w-0 cursor-pointer" onclick="loadFromHistory(${idx})">
                <p class="text-xs text-white/90 line-clamp-1 font-medium group-hover:text-cyan-300 transition-colors">${escapeHtml(item.text)}</p>
                <span class="text-[10px] text-white/40">${item.date}</span>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="loadFromHistory(${idx}); speakText();" class="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-white transition" title="Replay">
                    <i class="fa-solid fa-play text-xs"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function loadFromHistory(idx) {
    if (!studioState.history[idx]) return;
    const textInput = document.getElementById('textInput');
    if (textInput) {
        textInput.value = studioState.history[idx].text;
        updateTextStats();
        showToast('Loaded clip from history', 'info', 'fa-clock-rotate-left');
    }
}

function clearAllHistory() {
    if (studioState.history.length === 0) return;
    if (confirm('Clear all playback history?')) {
        studioState.history = [];
        localStorage.removeItem('voicecraft_history');
        renderHistory();
        showToast('History cleared', 'info', 'fa-trash-can');
    }
}

// --- Range Sliders & Presets ---
function setSpeedPreset(speed) {
    studioState.rate = speed;
    const slider = document.getElementById('speedSlider');
    const display = document.getElementById('speedDisplay');
    if (slider) slider.value = speed;
    if (display) display.textContent = `${speed.toFixed(2)}x`;
    updateTextStats();
}

// --- Setup Event Listeners ---
function setupEventListeners() {
    // Textarea input
    const textInput = document.getElementById('textInput');
    if (textInput) {
        textInput.addEventListener('input', updateTextStats);
    }

    // Speed slider
    const speedSlider = document.getElementById('speedSlider');
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            studioState.rate = parseFloat(e.target.value);
            document.getElementById('speedDisplay').textContent = `${studioState.rate.toFixed(2)}x`;
            updateTextStats();
        });
    }

    // Pitch slider
    const pitchSlider = document.getElementById('pitchSlider');
    if (pitchSlider) {
        pitchSlider.addEventListener('input', (e) => {
            studioState.pitch = parseFloat(e.target.value);
            document.getElementById('pitchDisplay').textContent = `${studioState.pitch.toFixed(1)}`;
        });
    }

    // Volume slider
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            studioState.volume = parseFloat(e.target.value);
            document.getElementById('volumeDisplay').textContent = `${Math.round(studioState.volume * 100)}%`;
        });
    }

    // Language filter
    const langFilter = document.getElementById('languageFilter');
    if (langFilter) {
        langFilter.addEventListener('change', (e) => {
            renderVoiceOptions(e.target.value);
        });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl + Enter to Speak
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            speakText();
        }
        // Esc to Stop
        if (e.key === 'Escape' && studioState.isSpeaking) {
            stopSpeech();
        }
    });
}

// --- Floating Toast Notifications ---
function showToast(message, type = 'info', iconClass = 'fa-circle-info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colors = {
        success: 'bg-emerald-600 text-white',
        error: 'bg-rose-600 text-white',
        warning: 'bg-amber-500 text-white',
        info: 'bg-indigo-600 text-white'
    };

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl ${colors[type] || colors.info} text-xs font-semibold transition-all duration-300 transform translate-y-4 opacity-0 border border-white/20`;
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} text-sm flex-shrink-0"></i>
        <span class="flex-grow">${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 ml-2">
            <i class="fa-solid fa-xmark text-xs"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.remove('translate-y-4', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// --- Modern Web Guidance: Dialog Light-Dismiss Fallback ---
function setupModernDialogDismissal() {
    const dialogs = document.querySelectorAll('dialog');
    dialogs.forEach(dialog => {
        if (!('closedBy' in HTMLDialogElement.prototype)) {
            dialog.addEventListener('click', (event) => {
                if (event.target !== dialog) return;
                const rect = dialog.getBoundingClientRect();
                const isDialogContent = (
                    rect.top <= event.clientY &&
                    event.clientY <= rect.top + rect.height &&
                    rect.left <= event.clientX &&
                    event.clientX <= rect.left + rect.width
                );
                if (isDialogContent) return;
                dialog.close();
            });
        }
    });
}

// --- Helper Functions ---
function getLanguageName(code) {
    const map = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'hi': 'Hindi',
        'bn': 'Bengali',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ar': 'Arabic',
        'ru': 'Russian',
        'tr': 'Turkish'
    };
    return map[code] || code.toUpperCase();
}

function getFlagEmoji(langCode) {
    const country = langCode.includes('-') ? langCode.split('-')[1].toUpperCase() : '';
    if (country.length === 2) {
        const codePoints = country.split('').map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }
    return '🎙️';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
