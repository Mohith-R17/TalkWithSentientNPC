# Project: TalkWithSentientNPC — Comprehensive Technical Reference & Interview Guide

---

## SECTION 1 — FIRST UNDERSTAND THE PROJECT

### 1.1 Problem Statement
Modern video games still rely predominantly on static, hand-authored branching dialogue trees or rigid state machines for Non-Player Character (NPC) interaction. While effective for scripted narratives, static trees suffer from major drawbacks:
1. **Immersion-Breaking Mechanics:** Players must select from pre-baked text options, eliminating conversational spontaneity and role-playing agency.
2. **Exponential Authoring Overhead:** Creating branching dialogues for hundreds of NPCs across an open-world RPG becomes unmanageable for game writers.
3. **Cloud Latency & Availability Barriers:** Modern cloud-based conversational Large Language Models (e.g., OpenAI GPT-4, Anthropic Claude, ElevenLabs) cannot be integrated directly into offline gameplay. Cloud APIs introduce 1,000–3,000 ms round-trip latency, require persistent internet connectivity, incur per-token recurring costs, and pose privacy and reliability risks if cloud services experience outages.

**TalkWithSentientNPC** solves this problem by providing a real-time, voice-activated interactive AI framework that replaces static dialogue trees with dynamic, localized conversations running entirely on edge/consumer hardware without any external cloud APIs.

### 1.2 Target Users & Primary Stakeholders
- **Game Players:** Gamers seeking organic, hands-free verbal immersion where speaking naturally into a headset triggers contextually relevant NPC responses in a Skyrim fantasy setting.
- **Game Developers & Designers:** Studios and indie game developers aiming to deploy intelligent NPC interaction without cloud infrastructure costs, offline-play constraints, or multi-second conversational lag.
- **Applied AI / NLP Researchers:** Engineers exploring domain-specialized, highly compressed neural architectures that perform real-time speech-to-text, sequence-to-sequence language modeling, and neural speech synthesis within strict edge latency budgets.

### 1.3 Main Features
- **100% Offline Edge Pipeline:** Local speech recognition, neural dialogue generation, and neural acoustic synthesis running without network dependency.
- **Sub-300 ms NLP Latency:** A custom-trained Encoder-Decoder Transformer with approximately 2.6M parameters (a compact ~32 MB Keras model) delivering ~245 ms CPU inference latency.
- **Domain-Specific Fantasy Coherence:** Trained on 7,565 Skyrim-style NPC-Player dialogue pairs, achieving a BERTScore-F1 of 0.904 and preserving lore consistency.
- **Client-Side Audio Engineering:** Browser-based Web Audio graph featuring automated microphone gain management, linear interpolation resampling to 16,000 Hz, in-memory 16-bit binary RIFF WAV encoding, and RMS-based dead-air silence rejection.
- **Atmospheric RPG Interface:** Medieval Skyrim tavern aesthetic built with React 19 and TypeScript, featuring dynamic NPC portrait states (idle, listening glow, thinking filter, speaking glow), typewriter history logging, audio autoplay unlocking, and Esc-key interrupt mechanics.
- **Dual Architecture Reference:** Both a modern asynchronous web client-server architecture ([FastAPI](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py) + React 19) and a standalone legacy multi-threaded desktop GUI ([Tkinter](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/legacy/chatbot_app.py)).

### 1.4 What is Technically Interesting
- **Small Specialized Model vs. Generic Giant LLM:** Demonstrates that a tiny 2.6M parameter Transformer trained from scratch on domain-specific dialogue pairs can match or exceed fine-tuned generic models (e.g., GPT-Neo 125M) on semantic metrics while running 10x faster on CPU.
- **Zero-Cloud Audio Pipeline:** Complete speech-to-speech lifecycle executed on consumer CPU by bridging browser Web Audio API PCM buffers, Vosk Kaldi acoustic decoding, Keras autoregressive decoding, and Silero PyTorch neural speech synthesis.
- **Synchronization across Heterogeneous AI Runtimes:** Unifies TensorFlow/Keras graph evaluation and PyTorch torchscript execution within Python's asynchronous event loop using `asyncio.Lock` and thread pool delegation to avoid GIL deadlocks and tensor memory buffer collisions.

### 1.5 Three Interview-Ready Explanations

#### One-Sentence Explanation
> "TalkWithSentientNPC is a fully offline, voice-activated AI dialogue framework that replaces static game dialogue trees with a real-time, domain-trained 2.6M parameter Transformer, Vosk STT, and Silero TTS running locally with sub-300 ms response times."

#### 30-Second Explanation
> "In modern RPGs, NPC dialogue is limited to pre-scripted text choices, while cloud LLMs are too slow and expensive for offline gameplay. I built TalkWithSentientNPC to deliver dynamic voice-to-voice interaction running completely on local hardware. The pipeline captures voice in the browser, downsamples and encodes it to 16kHz PCM WAV, transcribes it with Vosk, generates in-character responses using a custom 2.6M parameter Transformer trained on 7,500+ Skyrim dialogue pairs, and speaks the reply using Silero TTS. The entire NLP inference executes in ~245 ms on CPU with a BERTScore-F1 of 0.904, proving that small, specialized offline models can achieve high conversational immersion without cloud dependencies."

#### 1-to-2 Minute Explanation (Fresher SDE Pitch)
> "The goal of this project was to tackle immersion-breaking dialogue in games. Right now, open-world games rely either on static dialogue trees that limit player choice or cloud APIs that introduce 2 to 3 seconds of latency and break when the player goes offline.
>
> To solve this, I designed a low-latency, fully localized speech-to-speech dialogue framework. The system consists of a React 19 TypeScript frontend and an asynchronous FastAPI backend. When a player speaks, the browser uses the Web Audio API to capture raw Float32 audio, resamples it via linear interpolation to 16 kHz mono, packages it into a binary RIFF WAV container, and sends it to the backend. The backend processes the audio through an offline Vosk Kaldi recognizer, cleans the transcribed text, and passes it into a custom Seq2Seq Transformer that I trained from scratch in Keras.
>
> What makes this technically compelling is the model design: it has only 2.6 million parameters—roughly 32 MB on disk—with 4 encoder blocks, 4 decoder blocks, and 4 attention heads. Because it was trained specifically on Skyrim NPC dialogue pairs with teacher forcing and a warmup-cosine learning rate schedule, it achieves a BERTScore-F1 of 0.904 while completing inference in approximately 245 ms on a standard CPU. The output is synthesized through Silero neural TTS and streamed back to the browser for synchronized audio playback and NPC portrait animations.
>
> One of the toughest engineering challenges I faced was managing concurrency and browser audio constraints. Web browsers capture audio at 44.1 or 48 kHz in WebM/Opus, whereas Vosk strictly requires 16 kHz 16-bit PCM WAV. I wrote a client-side resampler and byte-level WAV encoder using DataView to bridge this format gap. On the backend, because TensorFlow models can corrupt internal tensor buffers when evaluated concurrently in a single process, I used `asyncio.Lock` to serialize model execution while delegating blocking C++ Kaldi and PyTorch workloads to background threads. The result is a seamless voice-to-voice NPC interaction that proves specialized edge AI is viable for gaming."

---

## SECTION 2 — ARCHITECTURE

### 2.1 Reverse-Engineered Architecture Diagram

```text
                                       +-------------------------------------------------------------+
                                       |                 BROWSER CLIENT (React 19 + Vite)            |
                                       |                                                             |
                                       |  [User Microphone]                                          |
                                       |         |                                                   |
                                       |         v                                                   |
                                       |  [Web Audio API Graph]                                      |
                                       |    MediaStreamAudioSourceNode -> ScriptProcessorNode (4096) |
                                       |                               -> SilenceGainNode (gain=0)   |
                                       |         | (Float32Array PCM chunks)                         |
                                       |         v                                                   |
                                       |  [Client Resampler: Linear Interpolation -> 16,000 Hz Mono] |
                                       |         |                                                   |
                                       |         v                                                   |
                                       |  [RMS Silence Filter: Check if RMS >= 0.00001]              |
                                       |         |                                                   |
                                       |         v                                                   |
                                       |  [Binary RIFF WAV Encoder: DataView -> 44-byte Header]      |
                                       |         |                                                   |
                                       |         v                                                   |
                                       |  [Blob: speech.wav (multipart/form-data)]                   |
                                       +------------------------------+------------------------------+
                                                                      |
                                                                      | HTTP POST /api/transcribe
                                                                      v
+----------------------------------------------------------------------------------------------------+
|                                 FASTAPI ASYNCHRONOUS BACKEND (Port 8000)                           |
|                                                                                                    |
|  [FastAPI Route: /api/transcribe]                                                                  |
|         |                                                                                          |
|         v                                                                                          |
|  [STTService: stt_service.py]                                                                      |
|    - Wave Header Inspection (Mono, 16-bit, 16000 Hz validation)                                    |
|    - ThreadPoolExecutor offload: loop.run_in_executor(None, run_vosk)                              |
|    - Vosk KaldiRecognizer (Shared vosk.Model)                                                      |
|         |                                                                                          |
|         +-----------------------------------------------------------+                              |
|                                                                     | JSON { text: "greetings" }   |
|                                                                     v                              |
|                                                      [Browser Client /api/chat invocation]         |
|                                                                     |                              |
|                                                                     | HTTP POST /api/chat          |
|                                                                     v                              |
|  [FastAPI Route: /api/chat]                                                                        |
|         |                                                                                          |
|         v                                                                                          |
|  [ChatbotService: chatbot_service.py]                                                              |
|    - Protected by asyncio.Lock()                                                                   |
|    - Regex Preprocessing & Vocabulary Stoi Tokenization                                            |
|    - Sequence Padding (MAX_ENCODER_LEN=7, MAX_DECODER_LEN=16)                                      |
|    - Custom Keras Transformer (2.6M Params) Autoregressive Greedy Loop                             |
|    - Vocabulary Itos Detokenization -> Text Response                                               |
|         |                                                                                          |
|         v                                                                                          |
|  [TTSService: tts_service.py]                                                                      |
|    - Protected by asyncio.Lock()                                                                   |
|    - Text Normalization & Punctuation Cleanup                                                      |
|    - PyTorch Silero TTS Model (asyncio.to_thread): speaker="en_1", sample_rate=48000            |
|    - NumPy Float32 -> Scipy wavfile write -> backend/audio/generated/{uuid}.wav                    |
|         |                                                                                          |
|         v                                                                                          |
|  [HTTP Response: JSON { text, audio_url: "/api/audio/{uuid}.wav", timings }]                      |
+----------------------------------------------------------------------------------------------------+
                                       |
                                       | HTTP Response + GET /api/audio/{filename}
                                       v
                                       +-------------------------------------------------------------+
                                       |                 BROWSER CLIENT (React 19 + Vite)            |
                                       |                                                             |
                                       |  [DialoguePanel: Append Player & NPC Dialogue to History]   |
                                       |  [NPCPortrait: Transition from THINKING to SPEAKING Glow]   |
                                       |  [AudioService: HTML5 Audio.play() with onEnded Callback]   |
                                       +-------------------------------------------------------------+
```

### 2.2 Component Breakdown
1. **Browser Client (Presentation & Audio Hardware Layer):**
   - *What it does:* Renders the Skyrim tavern UI, manages microphone access, records voice, downsamples audio, encodes WAV containers, manages speech/chat state machines, and plays NPC audio.
   - *Why it exists:* Isolates user experience, animations, and hardware interaction from server-side ML compute.
   - *Where in code:* [`frontend/src/App.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/App.tsx), [`frontend/src/components/`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/), [`frontend/src/services/speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts).
   - *What it communicates with:* Communicates with FastAPI via HTTP REST requests (`/api/transcribe`, `/api/chat`, `/api/audio/{filename}`, `/api/health`).

2. **FastAPI Web Framework & App State Gateway:**
   - *What it does:* Serves as the asynchronous HTTP interface, coordinates request validation, initializes in-memory AI model instances upon application startup, and routes requests to appropriate service modules.
   - *Why it exists:* Provides high-performance, non-blocking asynchronous request handling in Python, natively supporting async/await and thread pool delegation.
   - *Where in code:* [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L28-L50).
   - *What it communicates with:* Browser client (inbound HTTP), [STTService](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/stt_service.py), [ChatbotService](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py), and [TTSService](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/tts_service.py).

3. **STT Service (Vosk Kaldi Recognizer):**
   - *What it does:* Validates raw WAV audio headers (channels, bit depth, sample rate), extracts PCM bytes, and runs speech recognition to return text.
   - *Why it exists:* Translates audio waveforms into tokenizable English strings entirely offline with negligible RAM usage (~50 MB model).
   - *Where in code:* [`backend/services/stt_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/stt_service.py).
   - *What it communicates with:* Invoked by `transcribe_endpoint` in [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L225-L254); interfaces with C++ Kaldi bindings in `vosk`.

4. **Chatbot NLP Service (Custom Keras Transformer):**
   - *What it does:* Preprocesses input strings, converts words to token IDs using vocabulary dictionaries, feeds tokens into an Encoder-Decoder Transformer, executes autoregressive greedy decoding, and converts predicted token IDs back to a text response.
   - *Why it exists:* Serves as the cognitive brain of the NPC, providing Skyrim-style fantasy dialogue in ~245 ms.
   - *Where in code:* [`backend/services/chatbot_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py), [`backend/transformer_chatbot.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/transformer_chatbot.py).
   - *What it communicates with:* Invoked by `chat_endpoint` in [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L180-L224); loads weights from `backend/models/chatbot_model_skyrim.keras`.

5. **TTS Service (Silero Neural Synthesizer):**
   - *What it does:* Sanitizes generated response text, runs acoustic neural speech synthesis using PyTorch Silero TTS at 48,000 Hz, and writes the resulting NumPy waveform array to a unique `.wav` file on disk.
   - *Why it exists:* Converts text into spoken NPC dialogue with natural cadence without needing an internet connection.
   - *Where in code:* [`backend/services/tts_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/tts_service.py).
   - *What it communicates with:* Invoked by `chat_endpoint` in [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L180-L224); writes files to `backend/audio/generated/`.

6. **Filesystem Storage (Ephemeral & Static Artifacts):**
   - *What it does:* Stores pretrained model weights, serialized vocabularies (`.pkl`), and temporary generated audio WAV files.
   - *Why it exists:* Serves as disk persistence for model artifacts and file-based audio streaming buffers.
   - *Where in code:* [`backend/models/`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/models/), [`backend/audio/generated/`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/audio/).

### 2.3 Architecture Classification
- **Primary Classification:** **Client-Server Decoupled Full-Stack Architecture** with an **Asynchronous REST API Gateway** and **Serialized Edge ML Inference Services**.
- **Why this classification:**
  - It is **not classic MVC**: The backend is not serving server-rendered HTML views (like Django templates or Rails). The frontend is a standalone Single Page Application (SPA) bundled via Vite.
  - It is **not a Distributed Microservices Architecture**: All backend services (STT, NLP, TTS) run in a single Python OS process managed by Uvicorn. There is no service mesh, RPC, or separate container network.
  - It is **not Serverless**: It requires a persistent, long-running process because deep learning models (TensorFlow graph, Vosk Kaldi model, PyTorch Silero) take 5–15 seconds to load into memory on startup and cannot tolerate serverless cold starts.
  - It is a **Decoupled Monolithic Backend + SPA Frontend**: The backend encapsulates domain services within modular classes (`STTService`, `ChatbotService`, `TTSService`), while the frontend coordinates user interaction independently through a React functional component tree and custom state machines.

---

## SECTION 3 — END-TO-END FLOWS

### Flow 1: Voice-Activated NPC Dialogue Turn (Complete Audio-to-Audio Flow)
```text
User speaks -> Microphone capture -> Resampling (16kHz) -> RIFF WAV Encoding -> POST /api/transcribe 
-> Vosk ASR -> Transcribed text -> POST /api/chat -> Regex Sanitization -> Keras Transformer 
-> Greedy Autoregressive Loop -> Silero PyTorch TTS -> WAV on disk -> JSON Response 
-> HTML5 Audio.play() -> NPC Speaking Glow -> Dialogue Log Update
```
1. **User Action:** The player clicks the `VOICE` button in [`DialogueInput.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/DialogueInput.tsx#L53-L70) and speaks into the microphone (e.g., *"Who are you?"*).
2. **Frontend Handler & Audio Capture:**
   - [`DialogueInput.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/DialogueInput.tsx#L68) calls `startListening()` in [`useSpeechRecognition.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useSpeechRecognition.ts#L18-L55).
   - `startListening()` calls `speechService.startRecording()` in [`speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts#L45-L93).
   - `navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })` captures raw audio hardware.
   - An `AudioContext` is created; `createMediaStreamSource` connects to a `ScriptProcessorNode(4096, 1, 1)`.
   - Incoming `Float32Array` buffers from `onaudioprocess` are appended to `this.audioChunks`.
   - A `GainNode` with `gain.value = 0` connects the processor to `audioContext.destination`, allowing the audio processing clock to tick without speaker acoustic feedback.
3. **Voice Stop & Client Resampling/Encoding:**
   - The user clicks the button again (or a 15-second timer expires in `useSpeechRecognition.ts`).
   - `stopRecording()` in [`speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts#L95-L144) concatenates all `Float32Array` chunks into `mergedSamples`.
   - Root-Mean-Square (RMS) amplitude is calculated; if RMS < 0.00001 (dead air), it returns `null`.
   - `resampleTo16k(mergedSamples, origSampleRate)` applies linear interpolation to convert hardware rates (44.1k/48k) to 16,000 Hz.
   - `encodeWAV(samples16k, 16000)` allocates an `ArrayBuffer(44 + samples.length * 2)`, writes the 44-byte RIFF/WAVE header via `DataView`, converts Float32 (-1.0 to 1.0) into signed 16-bit PCM integers, and wraps it in `Blob({ type: 'audio/wav' })`.
   - Hardware tracks are terminated (`track.stop()`) and the `AudioContext` is closed to release OS mic locks.
4. **API Request (Transcription):**
   - `speechService.transcribe(blob)` creates `FormData`, appends `audio` as `speech.wav`, and issues an HTTP `POST /api/transcribe` with an `AbortController` (20-second timeout).
5. **Backend Route & STT Service:**
   - [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L225-L254) receives `UploadFile audio`.
   - Enforces max upload size: `if len(audio_bytes) > 5 * 1024 * 1024: raise HTTPException(413)`.
   - Passes bytes to `state.stt_service.transcribe_audio(audio_bytes)` in [`stt_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/stt_service.py#L11-L43).
   - Validates WAV header using Python's `wave.open`: verifies channels == 1, sample width == 2 (16-bit), framerate == 16000.
   - Offloads execution to worker thread pool: `await loop.run_in_executor(None, run_vosk)`.
   - `vosk.KaldiRecognizer(self.model, 16000)` consumes raw PCM frames and returns JSON with recognized text (e.g., `"who are you"`).
   - Backend returns `{"text": "who are you", "timings": {"stt_ms": 142}}`.
6. **Frontend Transition & Chat API Request:**
   - `useSpeechRecognition` returns the transcript to `DialogueInput.tsx`.
   - `handleSubmit()` invokes `onSubmit(transcript)`, which triggers `submitMessage()` in [`useChat.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useChat.ts#L33-L79).
   - `useChat.ts` sets `chatState = 'THINKING'`, appends player message to `history`, and calls `sendChatMessage(message)` in [`api.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/api.ts#L13-L40).
   - Issues HTTP `POST /api/chat` with body `{"message": "who are you"}`.
7. **Chatbot Model Inference:**
   - [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L180-L224) receives request and invokes `state.chatbot_service.generate_response(req.message)`.
   - In [`chatbot_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py#L18-L58), execution enters `async with self._lock:`.
   - Sanitizes text using regex: `re.sub(r'[\/:;\-_+@&!?$()<>.,@#%^&*"]', '', user_input)`.
   - Maps words to integer indices using `vocab_q.stoi()`.
   - Pads sequence to `MAX_ENCODER_LEN = 7` with post-padding: `enc_input = pad_sequences([input_tokens], maxlen=7, padding='post')`.
   - Initializes decoder list with `START_ID` (`vocab_a.stoi("startseq")`).
   - Iterates up to `MAX_DECODER_LEN - 1` (15 steps):
     * Pads `generated` sequence to `MAX_DECODER_LEN = 16`.
     * Evaluates Keras model: `logits = self.chatbot_model([enc_input_tf, dec_input_tf], training=False)`.
     * Extracts logits for last generated position: `logits[:, len(generated) - 1, :]`.
     * Finds highest probability token: `next_id = int(tf.argmax(next_logits, axis=-1).numpy()[0])`.
     * If `next_id == END_ID`, breaks loop; otherwise appends `next_id` to `generated`.
   - Detokenizes IDs using `vocab_a.itos()`, filtering out special tokens (0, START_ID, END_ID).
   - Returns string response (e.g., *"i am a traveler of the northern holds"*).
8. **TTS Acoustic Synthesis:**
   - `main.py` passes generated text to `state.tts_service.synthesize_and_save(bot_response["text"])` in [`tts_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/tts_service.py#L16-L51).
   - Enters `async with self._lock:`.
   - Sanitizes text with regex: `re.sub(r'[^a-zA-Z0-9\s,\.!?\']', '', clean_text)`.
   - Calls PyTorch Silero TTS via `asyncio.to_thread`: `self.tts_model.apply_tts(text=clean_text, speaker="en_1", sample_rate=48000)`.
   - Generates unique filename: `filename = f"{uuid.uuid4().hex}.wav"`.
   - Writes NumPy float array to disk via `asyncio.to_thread(wavfile.write, filepath, 48000, audio_numpy)`.
   - Returns `{"filename": filename, "tts_ms": 310}`.
9. **Backend Response:**
   - Backend returns HTTP 200 JSON:
     ```json
     {
       "text": "i am a traveler of the northern holds",
       "audio_url": "/api/audio/3a1f9e8b2c4d5e6f.wav",
       "timings": {
         "inference_ms": 242,
         "tts_ms": 310,
         "total_ms": 558
       }
     }
     ```
10. **Frontend UI & Audio Playback:**
    - `useChat.ts` receives payload, sets `npcResponse`, appends NPC message to `history`, and transitions `chatState = 'SPEAKING'`.
    - [`NPCPortrait.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/NPCPortrait.tsx#L17) applies `speakingGlow` box shadow.
    - [`DialoguePanel.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/DialoguePanel.tsx#L57-L72) displays dialogue text.
    - `audioService.playNpcAudio(response.audio_url, onEnded, onError)` instantiates HTML5 `new Audio(url)`.
    - When audio playback finishes, the `ended` event listener fires and resets `chatState = 'IDLE'`, removing the speaking glow and re-enabling user inputs.

---

### Flow 2: Text-Based Dialogue Turn
```text
User types text -> Press Enter / Click SPEAK -> Form onSubmit -> useChat.submitMessage() 
-> POST /api/chat -> Regex Sanitization -> Keras Transformer -> Silero TTS 
-> Audio file created -> JSON Response -> DialoguePanel update -> Audio playback
```
1. **User Action:** Player types *"Tell me about Skyrim"* in the input box and presses Enter or clicks the `SPEAK` button.
2. **Frontend Handler:**
   - [`DialogueInput.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/DialogueInput.tsx#L26-L51) intercepts `handleSubmit(e)`. Calls `e.preventDefault()`.
   - Verifies input is not empty and system is not busy (`chatState !== 'THINKING' && chatState !== 'SPEAKING'`).
   - Invokes `onSubmit(inputValue)` and clears input field.
3. **Execution in `useChat.ts`:**
   - Appends `{ role: 'user', text: message }` to `history` array.
   - Sets `chatState = 'THINKING'`.
   - Invokes `sendChatMessage(message)`.
4. **Backend Processing:**
   - Exactly identical to steps 7, 8, and 9 of Flow 1 (`chat_endpoint` -> `ChatbotService` -> `TTSService`).
5. **UI Update & Audio Stream:**
   - Dialogue history scrolls down automatically via `historyEndRef.current.scrollIntoView({ behavior: 'smooth' })` in [`DialoguePanel.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/DialoguePanel.tsx#L23-L27).
   - Audio is fetched via `GET /api/audio/{filename}` and played through speakers.

---

### Flow 3: Tavern Entrance & Audio Context Initialization
```text
Open Web App -> App State: INTRO -> User clicks ENTER THE TAVERN -> Background Audio starts 
-> App State: SCROLL -> Read Disclaimer -> User clicks PROCEED -> Music fades out 
-> App State: TAVERN -> TavernScene mounts -> Microphone & Audio contexts unlocked
```
1. **Initial Mount:** [`App.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/App.tsx#L10) initializes `appState = 'INTRO'`. Renders [`IntroScreen.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/IntroScreen.tsx).
2. **User Gesture (Circumventing Autoplay Policy):**
   - Modern browsers block programmatic audio playback without prior user interaction.
   - User clicks `ENTER THE TAVERN`.
   - [`App.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/App.tsx#L12-L16) executes `handleEnterTavern()`, invoking `audioService.playBackgroundMusic('/assets/skyrim_theme.mp3')`.
   - Because this call originates inside a trusted click event, the browser grants audio playback permissions.
   - Sets `appState = 'SCROLL'`.
3. **Scroll Disclaimer:**
   - Renders [`ScrollNotice.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/ScrollNotice.tsx), presenting the parchment scroll notice detailing the experimental 2.6M parameter model and non-commercial educational notice.
4. **Proceed to Tavern:**
   - User clicks `PROCEED`.
   - [`App.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/App.tsx#L18-L22) executes `handleProceed()`, calling `audioService.fadeOutBackgroundMusic(1500)`.
   - In [`audio.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/audio.ts#L44-L66), an interval timer decrements `backgroundAudio.volume` every 75 ms across 20 steps until volume hits 0, pausing and clearing the audio element.
   - Sets `appState = 'TAVERN'`, mounting [`TavernScene.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/TavernScene.tsx) in an active, audio-unlocked browser environment.

---

### Flow 4: Real-Time Dialogue Interruption via Escape Key
```text
NPC is speaking -> Player presses Escape key -> window keydown event listener in useChat.ts 
-> audioService.stopNpcAudio() -> HTML5 Audio pauses and resets -> chatState transitions to IDLE 
-> NPCPortrait glow clears -> Input fields re-enabled
```
1. **Trigger:** While the NPC is speaking (`chatState === 'SPEAKING'`), the player presses the `Escape` key.
2. **Event Handling:** In [`useChat.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useChat.ts#L22-L31), a global `window.addEventListener('keydown')` listener checks:
   `if (e.key === 'Escape' && chatStateRef.current === 'SPEAKING')`.
3. **Audio Teardown:** Calls `audioService.stopNpcAudio()`, which pauses `this.currentAudio`, sets `currentTime = 0`, and clears the audio reference in [`audio.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/audio.ts#L24-L30).
4. **State Reset:** Calls `setChatState('IDLE')`. The portrait glow disappears, and the dialogue box allows new user input immediately without waiting for the audio file to complete.

---

### Flow 5: Silence Rejection & Automatic Error Recovery
```text
User clicks VOICE -> User stays silent -> Stop recording -> Calculate RMS of Float32 array 
-> RMS < 0.00001 -> Audio discarded -> UI displays "The tavern heard nothing" 
-> Auto-recovery timer fires -> State resets to IDLE after 3 seconds
```
1. **Trigger:** Player starts voice recording but doesn't speak, or ambient noise is negligible.
2. **Audio Processing:** [`speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts#L126-L137) iterates over the recorded `mergedSamples` and computes root-mean-square amplitude:
   `rms = Math.sqrt(sumSquares / mergedSamples.length)`.
3. **Rejection:** Since `rms < 0.00001`, the method logs a warning, releases microphone tracks, closes the `AudioContext`, and returns `null`.
4. **Feedback & Recovery:** [`useSpeechRecognition.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useSpeechRecognition.ts#L80-L86) receives `null`, sets `speechState = 'IDLE'`, and sets `speechErrorMsg = 'The tavern heard nothing. (Speak clearly)'`. A 3-second `setTimeout` automatically clears the error message.

---

## SECTION 4 — TECH STACK

| Technology | Where Used in Project | Why Useful Here | How It Works Internally | Reasonable Alternative | Why Chosen Over Alternative | Key Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FastAPI** | [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py) | High-throughput asynchronous HTTP API gateway with automatic request validation. | Built on Starlette (ASGI toolkit) and Pydantic. Uses Python `asyncio` event loop for non-blocking I/O. | Flask | Native `async`/`await` support and built-in type validation; Flask requires gevent/gunicorn for async. | Single-process Python runtime remains subject to Global Interpreter Lock (GIL) for CPU tasks. |
| **Uvicorn** | [`run_app.bat`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/run_app.bat#L42) | Lightning-fast ASGI web server implementation. | Runs an optimized C-based event loop (`uvloop`) and HTTP parser (`httptools`). | Gunicorn | Uvicorn is lightweight, cross-platform (native on Windows), and ideal for single-node async execution. | Does not natively provide process supervision on Windows without external wrappers. |
| **TensorFlow / Keras** | [`backend/transformer_chatbot.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/transformer_chatbot.py), [`backend/services/chatbot_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py) | Constructing, training, and running the custom 2.6M parameter Transformer. | Compiles neural network computation graphs into optimized C++ tensor kernels using Eigen/BLAS. | PyTorch | Model was originally trained and serialized via Keras Functional API with `@register_keras_serializable`. | Model evaluation locks execution in a single process; requires explicit concurrency synchronization. |
| **Vosk (Kaldi)** | [`backend/services/stt_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/stt_service.py) | Real-time offline speech recognition. | Kaldi-based HMM-GMM / Nnet3 acoustic model and WFST decoder operating on 16kHz audio frames. | OpenAI Whisper (tiny) | Vosk uses ~50 MB RAM and transcribes on CPU in ~140 ms; Whisper requires >500 MB RAM and takes 1–2s on CPU. | Lower Word Error Rate (WER) accuracy on fantasy names/accents compared to large neural models. |
| **PyTorch & Silero TTS** | [`backend/services/tts_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/tts_service.py) | High-speed offline neural speech synthesis. | Enterprise TorchScript acoustic and vocoder model generating 48kHz audio directly on CPU. | Coqui TTS / eSpeak | eSpeak sounds like a robotic synth from the 1990s; Coqui is heavy and slow on CPU. Silero is compact and fast. | Synthesized voice lacks dramatic emotional prosody and has a noticeable synthetic cadence. |
| **Web Audio API** | [`frontend/src/services/speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts) | Browser audio graph capture, zero-gain feedback routing, and sample extraction. | Operates on the browser's dedicated low-latency real-time audio rendering thread. | MediaRecorder API | MediaRecorder outputs compressed WebM/Opus blobs that Vosk cannot read without server FFmpeg transcoding. | `ScriptProcessorNode` is marked deprecated in W3C specs in favor of `AudioWorkletNode`. |
| **Custom Binary RIFF WAV Encoder** | [`frontend/src/services/speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts#L168-L207) | Client-side WAV container serialization. | Allocates an `ArrayBuffer` and uses `DataView` to write 44-byte RIFF header and convert Float32 to 16-bit PCM. | `lamejs` / `recorder.js` | Zero third-party dependencies; direct byte-level memory control with minimal CPU and memory overhead. | Limited strictly to uncompressed 16-bit mono PCM format. |
| **Custom Linear Resampler** | [`frontend/src/services/speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts#L153-L166) | Downsampling browser audio (44.1k/48k) to 16,000 Hz. | Mathematical linear interpolation: $y = y_0(1 - w) + y_1(w)$ across fractional sample indexes. | Speex / WebAssembly SoX | 15 lines of pure TypeScript; eliminates 1 MB+ WASM binary overhead. | Can introduce minor high-frequency aliasing compared to sinc/polyphase band-limited interpolation. |
| **React 19 & TypeScript** | [`frontend/src/`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/) | Declarative UI state orchestration and type safety. | Virtual DOM fiber tree with concurrent scheduling, strict hooks, and compile-time type verification. | Vue 3 / Svelte | Industry standard for production web applications; powerful custom hook encapsulation (`useChat`). | Larger client bundle size compared to vanilla JavaScript or Svelte. |
| **Vite 8** | [`frontend/vite.config.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/vite.config.ts) | Frontend build tool and development server with API proxying. | Uses native ES modules (ESM) in browser during development and Rollup/esbuild for production bundling. | Webpack | Instant server start (<300 ms), near-instant Hot Module Replacement (HMR), zero-config proxy setup. | Proxied `/api` requests only exist during local development; production requires Nginx reverse proxy. |

---

## SECTION 5 — FRONTEND

### 5.1 Component Structure
The UI follows a hierarchical, modular component tree:
```text
main.tsx
  └── StrictMode
        └── App.tsx (Coordinates screen navigation: INTRO | SCROLL | TAVERN)
              ├── IntroScreen.tsx (Cinematic title screen & background audio trigger)
              ├── ScrollNotice.tsx (Parchment notice & disclaimer)
              └── TavernScene.tsx (Active RPG interaction viewport)
                    ├── NPCPortrait.tsx (Visual portrait, dynamic glow, and vignette)
                    ├── DialoguePanel.tsx (Scrollable dialogue history & active speech)
                    └── DialogueInput.tsx (Text box, submit button, voice recording toggle)
```

### 5.2 Routing
- **Routing Type:** **State-Driven View Rendering** (No URL-based routing library like `react-router-dom`).
- **Implementation:** In [`App.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/App.tsx#L7-L31), `appState` is typed as `'INTRO' | 'SCROLL' | 'TAVERN'`.
- **Why this was chosen:** The entire application represents a single, focused gaming experience. Traditional URL routes (`/intro`, `/tavern`) make no sense because navigating directly to `/tavern` without a user interaction gesture would cause the browser's Autoplay Policy to block audio playback.

### 5.3 State Management & Hooks
State is managed using custom React hooks rather than external global stores (Redux, Zustand, Pinia):
1. **`useChat` Hook ([`frontend/src/hooks/useChat.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useChat.ts)):**
   - States: `chatState: 'IDLE' | 'THINKING' | 'SPEAKING' | 'ERROR'`, `npcResponse: string`, `history: Message[]`.
   - Synchronized Ref: `chatStateRef` keeps a mutable reference to `chatState` inside asynchronous event listeners (e.g., keyboard listeners and audio callbacks) to prevent stale closure bugs.
   - Escape Key Interrupt: Intercepts `Escape` to call `audioService.stopNpcAudio()` and reset `chatState` to `'IDLE'`.
   - Error Auto-Recovery: Automatically resets `chatState` back to `'IDLE'` after 5 seconds if an error occurs.
2. **`useSpeechRecognition` Hook ([`frontend/src/hooks/useSpeechRecognition.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useSpeechRecognition.ts)):**
   - States: `speechState: 'IDLE' | 'LISTENING' | 'TRANSCRIBING' | 'ERROR'`, `speechErrorMsg: string`.
   - Ref Tracking: Uses `isStartingRef` and `speechStateRef` to handle asynchronous microphone hardware acquisition without race conditions.
   - Safety Timeout: Enforces a 15-second automatic stop timer to prevent memory leaks from forgotten open recordings.

### 5.4 Forms & Validation
- **Input Field:** Controlled React input in [`DialogueInput.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/DialogueInput.tsx#L79-L87) (`value={inputValue}`, `onChange={(e) => setInputValue(e.target.value)}`).
- **Busy Guard:** Form inputs and buttons are disabled when `isBusy` is true (`chatState === 'THINKING' || chatState === 'SPEAKING' || speechState === 'TRANSCRIBING'`).
- **Empty Check:** Submitting whitespace displays *"Speak your words, traveler."* with a 3-second auto-clearing error banner.
- **Rapid Double-Click Guard:** `voiceStartTimeRef` prevents stopping recording if the user clicks twice within 400 ms.

### 5.5 Authentication State
- **Current Project Status:** **Not verifiable from the current codebase.**
- There is no user authentication, session token, cookie, or login state in the frontend. All state is ephemeral and resets on page refresh.

### 5.6 React Concepts Connected to This Project
- **Custom Hooks (`useChat`, `useSpeechRecognition`):** Encapsulate complex side effects, audio listeners, and state machines, keeping UI components pure and focused solely on rendering.
- **Refs vs. State (`useRef` vs. `useState`):** In asynchronous event listeners (such as HTML5 audio `onended` or window `keydown`), React closures capture the state at render time. Using `chatStateRef.current = chatState` allows asynchronous callbacks to read the real-time state without re-binding listeners.
- **Effect Cleanup Functions:** Used in [`useSpeechRecognition.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useSpeechRecognition.ts#L125-L130) and [`useChat.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useChat.ts#L30) to remove event listeners and stop microphone hardware tracks on unmount, preventing ghost hardware indicators.
- **DOM Auto-Scrolling via Refs:** [`DialoguePanel.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/DialoguePanel.tsx#L22-L27) uses `historyEndRef.current.scrollIntoView({ behavior: 'smooth' })` inside a `useEffect` triggered whenever `history` updates.

---

## SECTION 6 — BACKEND AND APIs

### 6.1 Server Initialization & Lifespan Architecture
In [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L50-L155), FastAPI utilizes an `@asynccontextmanager lifespan(app: FastAPI)` function executed by Uvicorn on startup:
1. **Audio Directory Cleanup:** Scans `backend/audio/generated/` and deletes leftover `.wav` files from previous runs to prevent unbounded disk usage.
2. **Vosk STT Model Loading:** Loads the Kaldi model from `backend/models/vosk-model-small-en-us-0.15` into `state.vosk_model`.
3. **Silero TTS Model Loading:** Uses `asyncio.to_thread` with `torch.hub.load` to download/load `snakers4/silero-models` (`v3_en`, `en_1`) into `state.tts_model`.
4. **Vocabulary Deserialization:** Injects a dynamic `Vocabulary` class into the `__main__` namespace and unpickles `skyrim_vocab_q.pkl` and `skyirm_vocab_a.pkl`.
5. **Keras Transformer Loading:** Calls `load_model('chatbot_model_skyrim.keras', compile=False)` passing custom layers (`PositionalEncoding`, `DecoderBlock`, `ExpandMask`).
6. **Service Instantiation:** Instantiates `ChatbotService`, `TTSService`, and `STTService` on the global `state` singleton.

### 6.2 API Specification Table

| Method | Endpoint | Purpose | Input | Auth | Action Performed | Output (HTTP 200) | Failure Cases & HTTP Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | Service health check | None | None | Checks if models and vocabs are loaded in memory | `{"status": "ok", "model_loaded": true, "stt_loaded": true, "tts_loaded": true, "vocab_loaded": true}` | Returns `"status": "degraded"` if any model is not loaded. |
| **POST** | `/api/chat` | Generate text & spoken reply | JSON `{"message": "string"}` | None | Acquires `asyncio.Lock`, tokenizes query, runs Keras Transformer greedy decode, synthesizes audio via Silero TTS, saves WAV | `{"text": "reply string", "audio_url": "/api/audio/uuid.wav", "timings": {"inference_ms": 240, "tts_ms": 310, "total_ms": 550}}` | `400 Bad Request` (empty message); `503 Service Unavailable` (model uninitialized); `500 Internal Server Error` (inference/runtime crash). |
| **POST** | `/api/transcribe` | Transcribe speech audio | `multipart/form-data` with `audio: UploadFile` | None | Validates size (<5MB), validates WAV header (16kHz mono 16-bit), delegates to Vosk in thread pool | `{"text": "transcribed string", "timings": {"stt_ms": 145}}` | `400 Bad Request` (invalid WAV header or channels); `413 Payload Too Large` (>5MB); `503 Service Unavailable` (Vosk uninitialized); `500 Internal Server Error`. |
| **GET** | `/api/audio/{filename}` | Stream generated TTS audio | URL path parameter `filename` | None | Validates path against directory traversal, streams WAV file via `FileResponse` | Binary audio stream (`audio/wav`) | `403 Forbidden` (directory traversal attempt); `404 Not Found` (file does not exist). |

### 6.3 HTTP Fundamentals Connected to This Project
- **Idempotency:** `GET /api/health` and `GET /api/audio/{filename}` are idempotent (repeating them does not alter server state). `POST /api/chat` is **non-idempotent** because every invocation runs neural synthesis and writes a new uniquely named UUID WAV file to the server disk.
- **Content Negotiation & MIME Types:** Requests to `/api/chat` send `Content-Type: application/json`. Audio uploads to `/api/transcribe` use `multipart/form-data; boundary=...`. Audio streaming uses `Content-Type: audio/wav`.
- **CORS (Cross-Origin Resource Sharing):** In development, Vite runs on `http://localhost:5173` while FastAPI runs on `http://127.0.0.1:8000`. To prevent browser cross-origin blocks, Vite uses a reverse-proxy config (`/api` -> `http://127.0.0.1:8000`), and FastAPI enables `CORSMiddleware` with `allow_origins=["*"]`.

---

## SECTION 7 — DATABASE

### 7.1 Current Data Model Analysis
- **Does a database exist in this project?** **NO.**
- **Statement for Interviewers:** *"Not verifiable from the current codebase. The application does not use a database (relational or NoSQL). All persistence is file-based and in-memory."*
- **How Data is Actually Stored:**
  1. **Vocabulary Mappings:** Serialized Python dictionaries inside pickle files (`skyrim_vocab_q.pkl`, `skyirm_vocab_a.pkl`). Loaded once into heap memory at server startup.
  2. **Model Weights:** Static binary weights and computation graph serialized in HDF5/Keras format (`chatbot_model_skyrim.keras`).
  3. **Acoustic Models:** Static Kaldi graph folder (`vosk-model-small-en-us-0.15`).
  4. **Dialogue History:** Stored entirely in client-side React memory (`useState<Message[]>` inside [`useChat.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useChat.ts#L15)).
  5. **Generated Speech:** Ephemeral `.wav` files stored in `backend/audio/generated/` and purged when the server restarts.

### 7.2 Why No Database Was Used
- **Single-Turn Design:** The NPC evaluates each question in isolation; there is no multi-turn conversational session context required across requests.
- **Zero-Config Local Prototyping:** Adding PostgreSQL or MongoDB would require database installation, schema migrations, and connection management, violating the goal of a self-contained, offline gaming prototype.

### 7.3 What Happens When Two Users Update Data?
- There are no database writes to conflict.
- However, if two users send concurrent requests to `/api/chat`, a memory-level race condition would occur in TensorFlow without synchronization. Because TensorFlow Keras models maintain shared computational graphs and execution state in a single Python process, concurrent invocations can interleave tensor evaluation buffers.
- This is resolved in the codebase using `asyncio.Lock()` in [`ChatbotService`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py#L16) and [`TTSService`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/tts_service.py#L13), ensuring only one request evaluates the model at any given millisecond.

### 7.4 Scaling: Relational Schema Design (If Persisting Dialogue)
If this project scaled to an MMO game server or web platform with user accounts and dialogue history, PostgreSQL would be the optimal choice.

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Sessions Table
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    npc_identifier VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Dialogue Interactions Table
CREATE TABLE dialogues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    player_query TEXT NOT NULL,
    npc_response TEXT NOT NULL,
    audio_s3_url VARCHAR(255),
    inference_ms INTEGER NOT NULL,
    tts_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_dialogues_session_id ON dialogues(session_id);
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_dialogues_created_at ON dialogues(created_at DESC);
```

---

## SECTION 8 — AUTHENTICATION AND SECURITY

### 8.1 Current Authentication Status
- **Current Project Status:** **Not verifiable from the current codebase.**
- The project has no user accounts, passwords, OAuth, JWTs, API keys, or session cookies. Every endpoint is open and unauthenticated.
- **Why:** The project was built as a local, standalone research prototype and game integration demo where all compute runs on the user's local machine.

### 8.2 Security Inspection — What the Code Does Well
1. **Directory Traversal Protection ([`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L261-L263)):**
   ```python
   # Prevent path traversal
   if os.path.abspath(filepath) != os.path.join(os.path.abspath(AUDIO_OUTPUT_DIR), filename):
       raise HTTPException(status_code=403, detail="Forbidden")
   ```
   If an attacker sends `GET /api/audio/../../etc/passwd` or `..\..\Windows\System32\cmd.exe`, `os.path.abspath` resolves the relative traversal dots. The equality check detects that the resolved path escapes `AUDIO_OUTPUT_DIR` and rejects it with `403 Forbidden`.
2. **File Size Enforcement ([`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L235-L236)):**
   Limits uploaded audio to 5 MB (`if len(audio_bytes) > 5 * 1024 * 1024: raise HTTPException(413)`), mitigating memory exhaustion attacks.
3. **Audio Header Validation ([`backend/services/stt_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/stt_service.py#L14-L26)):**
   Strictly enforces valid WAV structure using Python's `wave` module, rejecting malformed binary payloads before passing them to the C++ Kaldi recognizer.
4. **Input Sanitization ([`backend/services/chatbot_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py#L23)):**
   Uses regex stripping to eliminate non-alphanumeric characters, preventing token injection and unexpected tokenizer behavior.

### 8.3 Current Vulnerabilities & Weaknesses
1. **No Rate Limiting:** An attacker could flood `/api/chat` with thousands of requests, causing CPU saturation and denying service to legitimate users.
2. **Wildcard CORS Configuration (`allow_origins=["*"]`):** Any website can send cross-origin requests to the user's locally running backend.
3. **Unverified SSL Context ([`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L22-L26)):**
   `ssl._create_default_https_context = ssl._create_unverified_context` disables SSL certificate validation during torch hub model downloads, leaving downloads vulnerable to man-in-the-middle attacks on untrusted networks.
4. **Unbounded Disk Storage via UUIDs:** Audio files are saved as `{uuid}.wav` without an automated time-to-live (TTL) expiration daemon. A long-running server session could eventually exhaust local disk space.

### 8.4 How to Secure This Application for Production
- **Authentication:** Implement JWT (JSON Web Tokens) stored in secure, `HttpOnly`, `SameSite=Strict` cookies.
- **Rate Limiting:** Add `slowapi` or Redis-backed token-bucket rate limiting (e.g., maximum 10 chat requests per minute per IP).
- **CORS Restriction:** Restrict allowed origins to specific domains (e.g., `https://sentient-npc.example.com`).
- **Object Storage with Presigned URLs:** Instead of writing audio to local disk, stream audio directly to AWS S3 and serve short-lived (e.g., 5-minute) presigned URLs.
- **Transport Security:** Enforce TLS 1.3 / HTTPS via reverse proxy (Nginx / Cloudflare).

---

## SECTION 9 — IMPORTANT CODE

### 1. Lifespan Audio Purge & Model Preloading
- **File & Function:** [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L50-L155), `lifespan(app: FastAPI)`
- **What it does:** Runs on server startup before requests are accepted. Cleans leftover `.wav` files from the disk directory, loads Vosk, Silero, and Keras models, and initializes singleton services.
- **Why it exists:** Deep learning models take ~10 seconds to load into RAM. Preloading them ensures zero cold-start latency on user requests, while the file purge prevents disk exhaustion.
- **Key Concept:** Modern ASGI application lifecycle management replacing deprecated `@app.on_event("startup")`.
- **Interviewer Question:** *"Why load models in lifespan rather than loading them lazily inside the route when the first user sends a message?"*
- **Answer:** *"Lazy loading causes the first user to experience a 10-second request timeout. Lifespan preloads models once during server initialization, guaranteeing sub-300 ms latency for every user request."*

### 2. Path Traversal Guard
- **File & Function:** [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L255-L265), `get_audio(filename: str)`
- **What it does:** Checks `os.path.abspath(filepath) != os.path.join(os.path.abspath(AUDIO_OUTPUT_DIR), filename)` and raises `HTTPException(403)`.
- **Why it exists:** Prevents malicious path manipulation attacks like `GET /api/audio/../../etc/passwd`.
- **Key Concept:** Canonical path resolution and filesystem security.
- **Interviewer Question:** *"How does `os.path.abspath` prevent path traversal attacks?"*
- **Answer:** *"It resolves all relative segment dots (`..` and `.`) into an absolute normalized path. By comparing the resolved canonical path against the expected directory root, we ensure the file resides strictly within the designated folder."*

### 3. Model Critical Section Lock (`asyncio.Lock`)
- **File & Function:** [`backend/services/chatbot_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py#L18-L21), `generate_response(user_input: str)`
- **What it does:** Wraps text generation inside `async with self._lock:`.
- **Why it exists:** TensorFlow models share internal computational state and memory buffers. Concurrent calls without a lock could interleave tensor allocations and corrupt responses.
- **Key Concept:** Mutual exclusion (mutex) in asynchronous coroutine runtimes.
- **Interviewer Question:** *"If Python has the Global Interpreter Lock (GIL), why do you still need `asyncio.Lock`?"*
- **Answer:** *"The GIL only serializes Python bytecode instructions, not asynchronous coroutines. When an async function reaches an `await`, it yields control to the event loop. Without an `asyncio.Lock`, two coroutines would interleave calls into the shared Keras model instance."*

### 4. Autoregressive Greedy Decoding Loop
- **File & Function:** [`backend/services/chatbot_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py#L30-L42), `generate_response(user_input: str)`
- **What it does:** Loops up to 15 times, passing current tokens through the Transformer, selecting the highest-probability token using `tf.argmax`, and breaking when `END_ID` is encountered.
- **Why it exists:** Generates sequential natural language tokens one step at a time based on previously generated context.
- **Key Concept:** Autoregressive Seq2Seq decoding and greedy token selection.
- **Interviewer Question:** *"What is the time complexity of this greedy decoding loop?"*
- **Answer:** *"If $L$ is the maximum decoder length (16) and $V$ is vocabulary size (~3,000), each step evaluates the model ($O(B \cdot L^2 \cdot d)$ self-attention) and performs argmax over $V$ ($O(V)$). The total complexity is $O(L \cdot (M_{eval} + V))$."*

### 5. Multi-Threaded Audio Transcription Delegation
- **File & Function:** [`backend/services/stt_service.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/stt_service.py#L31-L42), `transcribe_audio(audio_bytes: bytes)`
- **What it does:** Uses `loop.run_in_executor(None, run_vosk)` to run synchronous C++ Kaldi recognition on Python's default thread pool.
- **Why it exists:** Vosk transcription is CPU-bound and takes ~140 ms. Running it synchronously on the main event loop would freeze FastAPI, blocking all concurrent HTTP requests.
- **Key Concept:** Offloading blocking synchronous work from an asynchronous event loop.
- **Interviewer Question:** *"Why not just define `def transcribe_audio` as a standard synchronous function?"*
- **Answer:** *"FastAPI runs regular `def` routes in a thread pool automatically, but by explicitly using `run_in_executor`, we maintain fine-grained async control within our service layer and avoid tying up worker threads before header validation."*

### 6. Causal & Padding Mask Combination
- **File & Function:** [`backend/transformer_chatbot.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/transformer_chatbot.py#L87-L94), `DecoderBlock.call()`
- **What it does:** Computes a lower-triangular causal mask with `tf.linalg.band_part`, expands it to match batch dimensions, and combines it with the padding mask using `tf.logical_and`.
- **Why it exists:** Prevents decoder self-attention from attending to future tokens (preventing "lookahead cheating") while simultaneously masking out zero-padded tokens.
- **Key Concept:** Masked Multi-Head Attention in Transformer decoders.
- **Interviewer Question:** *"What does `tf.linalg.band_part(tensor, -1, 0)` do mathematically?"*
- **Answer:** *"It extracts a lower triangular matrix by zeroing out all elements above the main diagonal (setting upper band to 0 while keeping all lower bands with -1)."*

### 7. Custom Mask Expansion Layer
- **File & Function:** [`backend/transformer_chatbot.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/transformer_chatbot.py#L12-L21), `ExpandMask.call()`
- **What it does:** Converts 2D boolean masks `(batch, seq_len)` into 3D broadcastable masks `(batch, 1, seq_len)`.
- **Why it exists:** Keras `MultiHeadAttention` requires a 3D attention mask to broadcast properly across attention heads and sequence length dimensions.
- **Key Concept:** Tensor broadcasting and custom Keras layer serialization with `@register_keras_serializable()`.
- **Interviewer Question:** *"Why is the `@register_keras_serializable()` decorator essential here?"*
- **Answer:** *"Without it, saving or loading the model with `tf.keras.models.load_model` fails with an unrecognized layer error because Keras cannot serialize custom layer classes by default."*

### 8. Learned Positional Encoding Layer
- **File & Function:** [`backend/transformer_chatbot.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/transformer_chatbot.py#L25-L49), `PositionalEncoding.call()`
- **What it does:** Generates integer positions `tf.range(seq_len)`, passes them through a learned `Embedding(max_len, dim)` layer, and adds the vectors to word embeddings.
- **Why it exists:** Transformers process all sequence positions simultaneously in parallel. Without positional encoding, the model is permutation-invariant and cannot distinguish between word orders.
- **Key Concept:** Sequence order representation in Transformer architectures.
- **Interviewer Question:** *"Why use learned positional embeddings instead of sinusoidal (fixed) embeddings?"*
- **Answer:** *"For short sequences (maxlen=64) in a constrained domain, learned embeddings train quickly and adapt directly to positional syntax patterns without requiring manual trigonometric math."*

### 9. Client-Side Linear Resampling
- **File & Function:** [`frontend/src/services/speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts#L153-L166), `resampleTo16k()`
- **What it does:** Downsamples Float32 arrays from native hardware rates (44.1k/48k) to 16,000 Hz using linear interpolation.
- **Why it exists:** Vosk's acoustic model requires 16,000 Hz audio. Passing 48,000 Hz audio results in gibberish or fatal acoustic frame errors.
- **Key Concept:** Digital Signal Processing (DSP) and sample rate conversion.
- **Interviewer Question:** *"What are the tradeoffs of linear interpolation versus polyphase filter resampling?"*
- **Answer:** *"Linear interpolation is $O(N)$ and takes <2 ms in pure TypeScript with zero external dependencies. Polyphase sinc filtering produces less high-frequency aliasing but requires complex WebAssembly libraries."*

### 10. Binary RIFF WAV Header Serialization
- **File & Function:** [`frontend/src/services/speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts#L168-L207), `encodeWAV()`
- **What it does:** Writes 44 binary bytes specifying RIFF chunks, audio format (PCM=1), channels (1), sample rate (16000), byte rate, and converts Float32 audio samples to signed 16-bit integers via `DataView`.
- **Why it exists:** Browsers only record WebM/Opus out of the box. Writing a custom WAV encoder allows creating valid WAV files directly in browser memory without external libraries.
- **Key Concept:** Binary file format encoding, little-endian byte ordering, and PCM quantization.
- **Interviewer Question:** *"How do you convert Float32 audio samples into signed 16-bit PCM?"*
- **Answer:** *"Float32 samples range from -1.0 to 1.0. For negative values, we multiply by 0x8000 (32768); for positive values, we multiply by 0x7FFF (32767), clamping between -32768 and 32767, and write via `view.setInt16(offset, val, true)` with little-endian ordering."*

### 11. Stale-Closure Guard in Asynchronous State Machine
- **File & Function:** [`frontend/src/hooks/useSpeechRecognition.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/hooks/useSpeechRecognition.ts#L12-L16), `speechStateRef`
- **What it does:** Keeps `speechStateRef.current` synchronized with `speechState` and checks the ref before transitioning states in async functions.
- **Why it exists:** Asynchronous browser calls (like `getUserMedia` or `fetch`) complete after hundreds of milliseconds. Reading React `speechState` inside async callbacks accesses stale values from the time the function was invoked.
- **Key Concept:** JavaScript closures and React state synchronization.
- **Interviewer Question:** *"Why not just include `speechState` in the dependency array instead of using a ref?"*
- **Answer:** *"Recreating functions like `startListening` on every state change causes unnecessary re-renders in child components and can trigger race conditions if an event fires while the hook is re-binding."*

---

## SECTION 10 — CHALLENGES

### Challenge 1: Browser-to-Engine Audio Format Incompatibility
- **Problem:** Browsers capture microphone input at operating system native sample rates (typically 44,100 Hz or 48,000 Hz) and format audio as compressed WebM or raw Float32 arrays. Vosk's Kaldi engine strictly requires uncompressed 16,000 Hz, 1-channel, 16-bit linear PCM inside a valid RIFF WAV container. Passing raw browser audio caused STT to throw fatal exceptions or return empty strings.
- **Why it was difficult:** Browsers provide no native API to re-encode audio to 16kHz WAV out of the box without downloading massive WebAssembly binaries (like FFmpeg WASM, >25 MB).
- **Solution:** Wrote a lightweight, zero-dependency client-side audio pipeline in [`speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts):
  1. Captured raw Float32 samples using `ScriptProcessorNode(4096, 1, 1)`.
  2. Implemented a linear resampling algorithm (`resampleTo16k`) that interpolates fractional sample steps down to 16,000 Hz.
  3. Built a binary RIFF WAV encoder (`encodeWAV`) using `ArrayBuffer` and `DataView` to write the standard 44-byte WAV header and pack 16-bit signed PCM samples.
- **Alternative Solution:** Uploading WebM audio to the backend and using `ffmpeg-python` on the server to transcode to WAV.
- **Tradeoff:** Server-side transcoding adds 100–250 ms of conversion latency per request and requires FFmpeg installed on the host OS. Client-side encoding takes <5 ms and offloads computation to the user's browser.
- **Learning:** Understanding byte-level binary formats, little-endian ordering, and PCM audio quantization is essential for building real-time audio systems.

### Challenge 2: Event Collision & Premature Recording Cutoff on the VOICE Button
- **Problem:** On the first voice session, recording worked normally. On subsequent voice sessions, clicking the `VOICE` button immediately triggered *"The tavern heard nothing. (Speak clearly)"* without waiting for the user to speak.
- **Why it was difficult:** The bug did not reproduce on the very first click, making it appear intermittent or timing-dependent.
- **Root Cause (Two Intersecting Bugs):**
  1. *Pointer vs. Click Event Collision in `DialogueInput.tsx`:* The button had simultaneous `onPointerDown`, `onPointerUp`, and `onClick` handlers. On the first click, `getUserMedia` took ~300 ms to negotiate hardware permissions, so pointer and click events finished while state was still `'IDLE'`. On subsequent clicks, permissions were cached; `getUserMedia` returned in 2 ms. `pointerdown` started recording immediately and set state to `'LISTENING'`. When the mouse button was released 40 ms later, the browser fired `click`, which observed `speechState === 'LISTENING'` and immediately called `stopListening()`. This stopped the recording after only 40 ms, producing an empty audio chunk.
  2. *Chromium Driver Stalling in `speech.ts`:* An initial attempt to cache `MediaStream` across sessions caused Chromium on Windows to output silent audio frames (RMS = 0) once `MediaStreamAudioSourceNode` was disconnected and reattached.
- **Solution:**
  1. Standardized on a clean `onClick` toggle pattern in [`DialogueInput.tsx`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/components/DialogueInput.tsx#L53-L70), removing all pointer listeners and adding a 400 ms debounce guard (`voiceStartTimeRef`).
  2. Implemented full hardware teardown (`cleanupAudio()`) in [`speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts#L11-L43), calling `track.stop()` on all microphone tracks and closing `AudioContext` at the end of each session. Every session starts with fresh hardware tracks.
- **Tradeoff:** Re-acquiring microphone hardware on every session incurs a 10–20 ms initialization delay, but guarantees non-zero audio buffers and clean OS hardware indicator states.
- **Learning:** Never mix pointer down/up events with click handlers on state-toggling buttons, and always cleanly release OS media streams between recording sessions.

### Challenge 3: Keras Custom Layer Serialization and De-serialization
- **Problem:** Loading the trained Transformer model with `load_model("chatbot_model_skyrim.keras")` failed with `ValueError: Unknown layer: PositionalEncoding` or `ExpandMask`.
- **Why it was difficult:** In Keras 3 and TensorFlow 2.16+, custom layer serialization mechanics changed significantly, breaking traditional `get_config()` loading patterns.
- **Solution:**
  1. Decorated all custom layer classes (`PositionalEncoding`, `DecoderBlock`, `ExpandMask`) with `@register_keras_serializable()` in [`transformer_chatbot.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/transformer_chatbot.py).
  2. Passed a explicit `custom_objects` dictionary to `load_model` in [`main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py#L130-L138).
- **Alternative Solution:** Exporting model weights to `.weights.h5` and instantiating the model architecture manually in Python before loading weights.
- **Tradeoff:** Explicit custom object mapping keeps model loading concise while avoiding architecture code duplication.
- **Learning:** Custom neural network architectures require strict registration and configuration mapping to be portable across training and production inference environments.

---

## SECTION 11 — EDGE CASES AND FAILURES

| Scenario | What Happens in Current Code | Handled? | Ideal Production Handling |
| :--- | :--- | :--- | :--- |
| **Empty or Whitespace Input** | Frontend blocks submission with *"Speak your words, traveler."* If bypassed, backend raises `HTTPException(400, "Message cannot be empty")`. | **Yes** | Fully handled at both client and server boundaries. |
| **Pure Silence / Dead Air** | Frontend calculates RMS amplitude. If RMS < 0.00001 or duration < 300 ms, discards buffer and displays *"The tavern heard nothing"*. | **Yes** | Fully handled on client side; saves server from transcribing dead air. |
| **Audio File Exceeds 5 MB** | Backend checks `len(audio_bytes) > 5 * 1024 * 1024` and raises `HTTPException(413, "Audio file too large")`. | **Yes** | Fully handled. Ideal: Stream chunks and abort before reading entire body into memory. |
| **Invalid Audio Format** | `stt_service.py` validates WAV header via `wave.open`. If channels != 1, rate != 16000, or width != 2, raises `ValueError`, returning `HTTPException(400)`. | **Yes** | Fully handled. Ideal: Return detailed validation error message in JSON response. |
| **Out-of-Vocabulary (OOV) Words** | `vocab_q.stoi()` maps unknown words to index `0` (`<unk>`). Greedy decoding generates a fallback response (*"I have nothing to say to you, traveler."*). | **Yes** | Functionally handled. Ideal: Use Byte-Pair Encoding (BPE) tokenizer to eliminate out-of-vocabulary words. |
| **Microphone Permission Denied** | `getUserMedia` throws `NotAllowedError`. `useSpeechRecognition.ts` catches it and displays *"Microphone permission denied by browser."* | **Yes** | Fully handled with visual user feedback. |
| **Concurrent User Requests** | Both `ChatbotService` and `TTSService` use `asyncio.Lock()` to serialize access to model evaluation, preventing memory buffer corruption. | **Yes** | Safe for small concurrency. Under high load, requests queue up and latency increases linearly. Ideal: Worker pool / model replication. |
| **Path Traversal Attack on Audio** | `get_audio` checks `os.path.abspath(filepath) != os.path.join(...)` and raises `HTTPException(403, "Forbidden")`. | **Yes** | Fully handled; prevents unauthorized filesystem access. |
| **Escape Key Pressed While Speaking** | `useChat.ts` keydown listener stops audio playback immediately and resets `chatState` to `'IDLE'`. | **Yes** | Fully handled; provides immediate user interrupt control. |
| **Network Timeout during Fetch** | `api.ts` and `speech.ts` attach `AbortController` with explicit timeouts (45s and 20s). Timed-out requests reject cleanly. | **Yes** | Fully handled; avoids hanging indefinite browser promises. |
| **Rapid Double-Click on Voice Button** | `voiceStartTimeRef` checks `Date.now() - voiceStartTimeRef.current < 400` and ignores the second click. | **Yes** | Fully handled; prevents stopping recordings prematurely. |

---

## SECTION 12 — PERFORMANCE AND SCALING

### 12.1 The Current Bottlenecks
1. **The Global Model Mutex (`asyncio.Lock`):** Because Keras model inference and Silero TTS are protected by `asyncio.Lock`, the backend can only process one chat response at a time. If user A takes 550 ms, user B must wait 550 ms before their inference even begins.
2. **CPU-Bound PyTorch & TensorFlow Evaluation:** Running neural speech synthesis and autoregressive decoding on a single CPU thread caps server capacity at approximately 2–3 requests per second before CPU utilization hits 100%.
3. **Local Filesystem I/O:** Every TTS synthesis writes a new `.wav` file to disk. Operating system disk I/O and directory file scans become bottlenecks under sustained throughput.

### 12.2 What Breaks First Under 100x Load?
- **First Point of Failure:** Request queuing on `asyncio.Lock` in `ChatbotService`. As concurrency grows from 1 to 100 users, response latency degrades from ~550 ms to >50 seconds, triggering client-side `AbortController` timeouts.
- **Second Point of Failure:** CPU saturation on the Uvicorn worker process, leading to event loop starvation and dropped connections.
- **Third Point of Failure:** Storage exhaustion on the local filesystem as thousands of generated WAV files accumulate in `backend/audio/generated/`.

### 12.3 Realistic Step-by-Step Scaling Strategy for a Fresher
If this system needed to scale from 1 user to 10,000 active users, here is how to evolve the architecture without jumping straight to complex distributed systems:

#### Step 1: Model Optimization & Quantization (Immediate 3x–4x Gain)
- Convert the Keras Transformer and Silero TTS models to **ONNX Runtime** format with **INT8 quantization**.
- Reduces model disk footprint from 32 MB to ~8 MB and cuts CPU inference time from 245 ms to <70 ms.
- Enables models to run on cheaper, smaller server instances without GPU hardware.

#### Step 2: Multi-Process Horizontal Scaling (Scaling to Hundreds of Users)
- Run Uvicorn with multiple worker processes behind a local reverse proxy (Nginx):
  `uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000`
- Each OS worker process loads its own copy of the model into its independent memory space, allowing 4 concurrent inferences without lock contention.
- Nginx handles TLS termination, gzip compression, and static asset caching.

#### Step 3: Decoupled Object Storage with Auto-Expiring TTL
- Replace local disk WAV generation with an AWS S3 bucket configured with a 24-hour lifecycle deletion rule.
- Silero synthesizes audio into an in-memory byte buffer and uploads directly to S3 via `boto3`.
- Returns presigned CloudFront CDN URLs to the browser client, removing disk I/O bottlenecks from application servers.

#### Step 4: Asynchronous Task Queue for TTS Synthesis
- Decouple the text response from audio generation using Celery with Redis as a message broker.
- When a user sends a message:
  1. The Transformer generates text immediately (~70 ms).
  2. The text is returned to the client right away so dialogue displays instantly.
  3. A background Celery worker synthesizes the audio and pushes the audio URL over a WebSocket connection.

---

## SECTION 13 — "WHY NOT X?" QUESTIONS

### 1. Why not OpenAI Whisper for Speech-to-Text?
> *"Whisper is significantly more accurate on accents and open-vocabulary terms, but even Whisper-tiny has 39 million parameters and requires 300 to 800 ms of CPU compute on top of ~500 MB of RAM. Vosk uses a 50 MB Kaldi acoustic model that runs in ~140 ms with minimal memory footprint, which was essential for maintaining our sub-300 ms offline gaming latency budget."*

### 2. Why not an OpenAI GPT-4 API or Claude?
> *"Cloud APIs require constant internet connectivity, cost money per API call, and introduce 1,000 to 3,000 ms of network latency. In a video game, players expect immediate feedback when speaking to an NPC. A specialized offline model guarantees zero API costs, full privacy, offline playability, and sub-300 ms response times."*

### 3. Why train a Transformer from scratch instead of fine-tuning a pretrained LLM like LLaMA-3 8B?
> *"An 8-billion parameter LLM requires at least 6 GB of VRAM even with 4-bit quantization, making it impossible to run alongside a heavy AAA game engine on a single consumer PC. Our 2.6M parameter model requires only ~32 MB of disk space and runs inference in 245 ms on CPU without a GPU."*

### 4. Why not WebSockets instead of HTTP POST for the web app?
> *"For a turn-based dialogue system where the user speaks, waits, and receives a response, standard HTTP POST with JSON and multipart audio is simpler, stateless, and easier to debug. If we evolve the system to stream audio tokens in real time as the user speaks, WebSockets would become necessary."*

### 5. Why use `ScriptProcessorNode` instead of `AudioWorkletNode`?
> *"In modern Web Audio API standards, `AudioWorkletNode` is preferred because it runs on a separate audio thread. However, `ScriptProcessorNode` was sufficient for our prototype because our processing logic is simple (collecting Float32 chunks) and avoided the need to serve separate JavaScript worker files across development servers. For a production release, upgrading to `AudioWorklet` would be our first frontend improvement."*

### 6. Why not a SQL database like PostgreSQL or SQLite?
> *"The current prototype is strictly single-turn and designed for a single player on a local machine. Adding a database would introduce schema migration and dependency overhead without providing value, since there is no multi-turn context or cross-session user profile data to persist."*

### 7. Why PyTorch for Silero and TensorFlow for the Chatbot instead of unifying them in one framework?
> *"The dialogue Transformer was researched, built, and trained in Keras using its functional API and custom layer system. Silero TTS is officially published and optimized by its creators as a PyTorch TorchScript package. Rather than rewriting either model from scratch, we unified them at the service boundary in Python."*

### 8. Why Greedy Decoding instead of Beam Search?
> *"Greedy decoding selects the single highest-probability token at each step ($O(1)$ search overhead), completing generation in ~245 ms. Beam Search with a beam width of 4 would require 4x more forward passes through the Transformer, pushing latency beyond 1 second and breaking real-time conversational flow."*

### 9. Why not Redux or Zustand for React State Management?
> *"Our application has only two primary state concerns: chat status and speech recognition status. Custom React hooks (`useChat` and `useSpeechRecognition`) provide clean encapsulation without the boilerplate of Redux actions, reducers, or external store providers."*

### 10. Why AdamW with Warmup Cosine Decay instead of plain Adam?
> *"In small Transformer models trained on small datasets (7,500 pairs), plain Adam with a constant learning rate tends to destabilize in early epochs or overfit rapidly. A linear warmup over 300 steps allows attention layers to stabilize, and cosine decay prevents gradient oscillation near convergence. Weight decay (AdamW) acts as regularization against memorization."*

### 11. Why Linear Resampling instead of Polyphase / Sinc Resampling?
> *"Linear interpolation requires only 15 lines of pure TypeScript and executes in less than 2 milliseconds on a 1-second audio buffer. Sinc resampling provides higher anti-aliasing fidelity but requires heavy WebAssembly signal processing libraries that would bloat the client bundle."*

### 12. Why not Docker for local development?
> *"On Windows, Docker Desktop requires WSL2, virtualized memory allocation, and complex audio device passthrough configurations for microphones and speakers. Using Python virtual environments (`venv`) and native batch scripts (`run_app.bat`) allows the app to run natively with direct hardware audio access in one click."*

---

## SECTION 14 — CS FUNDAMENTALS CONNECTED TO THE PROJECT

### 14.1 Operating Systems (OS)
- **Threads vs. Processes:** In [`backend/main.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/main.py), Uvicorn runs in a single process. STT and TTS workloads are delegated to Python worker threads via `loop.run_in_executor` and `asyncio.to_thread`. In the legacy desktop app ([`legacy/chatbot_app.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/legacy/chatbot_app.py)), daemon threads run background microphone listeners.
- **Python Global Interpreter Lock (GIL):** CPU-bound Python code cannot run across multiple physical CPU cores in parallel within the same process. However, C++ extensions (like Vosk Kaldi bindings, PyTorch C++ kernels, and TensorFlow Eigen ops) release the GIL during execution, allowing true thread concurrency.
- **Race Conditions & Synchronization:** Multiple coroutines accessing the Keras model simultaneously would corrupt tensor evaluation buffers. The `asyncio.Lock` primitive provides mutual exclusion (mutex), ensuring serialized access.

### 14.2 Computer Networks
- **HTTP Methods & Headers:** Uses `GET` for safe, idempotent audio retrieval and health checks; uses `POST` with `Content-Type: application/json` and `multipart/form-data` for non-idempotent inference and audio transcription.
- **Client-Side Timeout Mechanics:** Implements `AbortController` in [`api.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/api.ts#L14) and [`speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts#L219) with explicit signal timeouts to prevent hanging sockets when backend inference takes too long.
- **CORS Protocol:** Browsers enforce the Same-Origin Policy. When Vite on port 5173 communicates with FastAPI on port 8000, the browser issues CORS preflight `OPTIONS` requests. FastAPI responds with `Access-Control-Allow-Origin: *` to authorize requests.

### 14.3 Database Management Systems (DBMS)
- **ACID Transactions vs. In-Memory State:** Traditional databases use write-ahead logging (WAL) and two-phase locking to guarantee Atomicity, Consistency, Isolation, and Durability. In our in-memory architecture, durability is traded for extreme read/write performance (<1 ms memory lookup for vocabularies).
- **Indexing Fundamentals:** A B-Tree index on a SQL database operates in $O(\log N)$ time. In our vocabulary system, token lookup is implemented via Python dictionaries (hash tables), which provide $O(1)$ average-time lookup for word-to-index conversion.

### 14.4 Object-Oriented Programming (OOP)
- **Encapsulation & Service Separation:** All business logic is encapsulated in dedicated service classes ([`ChatbotService`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py), [`STTService`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/stt_service.py), [`TTSService`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/tts_service.py)). The FastAPI route handlers never directly touch model internals or tensor manipulation.
- **Inheritance & Polymorphism:** Custom layers in [`transformer_chatbot.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/transformer_chatbot.py) inherit from `tensorflow.keras.layers.Layer`, overriding `build()`, `call()`, and `compute_mask()`.

### 14.5 Data Structures & Algorithms (DSA)
- **Tensors & Multidimensional Arrays:** 3D and 4D tensor manipulation during Multi-Head Attention ($[B, H, L, d_k]$) involving matrix multiplications, transpose operations, and causal band masking.
- **Hash Maps / Dictionaries:** `Vocabulary` class uses `_word_to_index` and `_index_to_word` hash maps to achieve $O(1)$ amortized word-to-token encoding and decoding.
- **Queues (FIFO):** In the legacy desktop app ([`legacy/chatbot_app.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/legacy/chatbot_app.py)), thread-safe `queue.Queue` structures buffer raw microphone audio frames and decouple audio capture from recognition processing.

---

## SECTION 15 — PROJECT WEAKNESSES

### 1. Strictly Single-Turn Dialogue (No Conversation Memory)
- **Why it matters:** The model evaluates each query in total isolation. If a player asks *"What is your name?"* and then asks *"Where were you born?"*, the model has zero recollection of its previous answer. In an open-world RPG, this breaks narrative consistency.
- **How to improve:** Implement a rolling context buffer that concatenates the previous $N$ conversation turns with the current prompt, or maintain a persistent conversation state vector in the encoder.

### 2. Greedy Decoding Mode Collapse & Repetitive Text
- **Why it matters:** Greedy decoding always selects the token with the highest logit ($\text{argmax}$). When exposed to uncertain or out-of-distribution inputs, it frequently gets trapped in repetitive loops (e.g., *"i don't know i don't know"*).
- **How to improve:** Implement Top-K sampling (e.g., $K=10$), Nucleus (Top-P) sampling, or a repetition penalty factor (as prototyped in `layered_predict` in the training notebook).

### 3. Global Model Lock Limits Concurrent Throughput
- **Why it matters:** The backend uses an `asyncio.Lock()` around Keras inference. Under multiple concurrent users, requests are serialized into a single-file queue, causing latency to degrade linearly.
- **How to improve:** Export the model to ONNX Runtime and run it inside a pool of stateless worker processes or container replicas behind an Application Load Balancer.

### 4. Ephemeral Audio Storage on Local Filesystem
- **Why it matters:** Generated WAV files are saved to `backend/audio/generated/` and only deleted when the server restarts. Under continuous operation, disk storage will fill up, eventually causing OS write errors.
- **How to improve:** Stream synthesized audio directly to cloud object storage (AWS S3) with automatic lifecycle expiration, or run an async background garbage-collection task that deletes audio files older than 5 minutes.

### 5. Deprecated `ScriptProcessorNode` in Frontend Audio Capture
- **Why it matters:** `ScriptProcessorNode` runs audio processing on the browser's main UI thread, which can cause audio glitches or frame drops if the main thread is busy with complex DOM re-renders.
- **How to improve:** Migrate to `AudioWorkletNode`, which runs audio processing on a dedicated audio rendering thread with low-latency `SharedArrayBuffer` data passing.

---

## SECTION 16 — RESUME CLAIM CHECK

| Potential Resume Claim | Codebase Verification | Status | Safer & Stronger Interview Wording |
| :--- | :--- | :--- | :--- |
| *"Built a scalable real-time voice AI system"* | Backend uses a single-process `asyncio.Lock` that serializes requests. Not horizontally scaled. | **PARTIALLY SUPPORTED** | *"Designed a low-latency voice AI pipeline achieving ~245 ms NLP inference on CPU, with an architecture designed for horizontal scaling via ONNX."* |
| *"Trained custom 2.6M parameter Transformer from scratch"* | Fully verified in [`transformer_chatbot.py`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/transformer_chatbot.py) and [`training.ipynb`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/training.ipynb) (4 blocks, 4 heads, dim=128, dim_ff=256). | **SUPPORTED** | *"Architected and trained a compact 2.6M parameter Encoder-Decoder Transformer from scratch in Keras, achieving sub-300 ms CPU inference."* |
| *"Achieved BERTScore-F1 of 0.904 on Skyrim dialogue"* | Verified in [`training.ipynb`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/training.ipynb) evaluation cells and project documentation across 7,565 pairs. | **SUPPORTED** | *"Trained on 7,565 domain-specific dialogue pairs, achieving a BERTScore-F1 of 0.904 to preserve fantasy lore semantics."* |
| *"Engineered secure full-stack web application"* | Path traversal guards and file size checks exist, but CORS is wildcard and there is no authentication or rate limiting. | **PARTIALLY SUPPORTED** | *"Engineered an asynchronous FastAPI and React 19 application with binary WAV encoding, path traversal guards, and audio payload validation."* |
| *"Integrated SQL / NoSQL database for dialogue logging"* | No database exists in the repository. All state is in-memory or on local disk. | **NOT SUPPORTED** | *"Designed the application with an in-memory client state machine, with a proposed relational schema for multi-turn production logging."* |
| *"Real-time browser-based voice processing"* | Fully verified in [`speech.ts`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/frontend/src/services/speech.ts) with Web Audio API, linear resampling, and binary RIFF WAV encoding. | **SUPPORTED** | *"Developed a client-side Web Audio DSP pipeline with custom linear resampling and binary RIFF WAV encoding to stream 16kHz PCM audio to Vosk."* |

---

## SECTION 17 — PROJECT INTERVIEW QUESTION BANK

### Project Overview
1. **[BASIC] Q: What problem does TalkWithSentientNPC solve?**
   - **Answer:** It replaces static dialogue trees in video games with dynamic, offline conversations using a localized AI pipeline, eliminating cloud latency, API costs, and immersion-breaking text menus.
   - **Likely Follow-up:** *"Why couldn't you just use OpenAI's API?"*
2. **[BASIC] Q: What are the three primary AI subsystems in the pipeline?**
   - **Answer:** Speech-to-Text using Vosk (Kaldi), dialogue generation using a custom 2.6M parameter Transformer, and Text-to-Speech using Silero neural TTS.
   - **Likely Follow-up:** *"How do they communicate with each other?"*
3. **[MEDIUM] Q: Why train a 2.6M parameter Transformer from scratch instead of fine-tuning LLaMA?**
   - **Answer:** A 2.6M parameter model requires only ~32 MB of disk space and completes inference in ~245 ms on a CPU. Pretrained LLMs (even 1B–8B models) require gigabytes of VRAM and are too heavy to run alongside a game engine on consumer PCs.
   - **Likely Follow-up:** *"Doesn't a tiny model suffer from limited vocabulary and hallucinatory repetition?"*

### Architecture & Concurrency
4. **[MEDIUM] Q: How does the backend prevent race conditions when multiple users send messages?**
   - **Answer:** In [`ChatbotService`](file:///c:/Users/R%20Mohith/Mohith/PROJECTS/TalkWithSentientNPC-main/backend/services/chatbot_service.py#L16), model evaluation is guarded by an `asyncio.Lock()`. This serializes model execution so concurrent requests cannot interleave tensor memory allocations.
   - **Likely Follow-up:** *"Doesn't a mutex destroy your throughput under high load?"*
5. **[DEEP] Q: Why use `loop.run_in_executor` in `stt_service.py`?**
   - **Answer:** Vosk's speech recognition executes in C++ and takes ~140 ms of CPU compute. Running it directly on the main event loop would block FastAPI from processing any other incoming HTTP requests. `run_in_executor` offloads it to a background thread.
   - **Likely Follow-up:** *"How does Python's GIL behave when Vosk is running in that background thread?"*
6. **[MEDIUM] Q: What is the architectural role of `lifespan` in `main.py`?**
   - **Answer:** It manages startup and shutdown events. On startup, it purges stale generated audio files from disk and preloads the Vosk, Silero, and Keras models into heap memory, eliminating cold-start latency.
   - **Likely Follow-up:** *"What happens if model loading fails during lifespan?"*

### Frontend & Audio DSP
7. **[MEDIUM] Q: Why did you write a custom linear resampler in TypeScript?**
   - **Answer:** Web browsers record audio at native OS hardware rates (44.1k or 48 kHz). Vosk requires strictly 16,000 Hz audio. The resampler downsamples audio client-side using linear interpolation without requiring heavy WebAssembly signal processing libraries.
   - **Likely Follow-up:** *"What kind of distortion or aliasing does linear interpolation introduce?"*
8. **[DEEP] Q: How does your binary WAV encoder work in `speech.ts`?**
   - **Answer:** It allocates an `ArrayBuffer(44 + samples.length * 2)` and uses `DataView` with little-endian encoding to write the 44-byte RIFF/WAVE header fields. It then quantizes Float32 samples (-1.0 to 1.0) into signed 16-bit PCM integers and wraps the buffer in a Blob.
   - **Likely Follow-up:** *"Why use DataView instead of a typed array like Uint8Array?"*
9. **[MEDIUM] Q: Why was a zero-gain `GainNode` used in the Web Audio graph?**
   - **Answer:** `ScriptProcessorNode` requires an active connection to `audioContext.destination` for the browser audio clock to trigger `onaudioprocess` callbacks. Routing through a `GainNode` with `gain = 0` allows the clock to tick while preventing microphone input from echoing through the player's speakers.
   - **Likely Follow-up:** *"What would happen if you didn't connect it to destination at all?"*

### Model & Training
10. **[DEEP] Q: Explain Teacher Forcing and how it was implemented in `training.ipynb`.**
    - **Answer:** During training, the decoder receives the ground-truth target sequence shifted by one token (`decoder_input = y[:-1]`) rather than its own predictions, while the target is `decoder_target = y[1:]`. This prevents error compounding in early epochs and accelerates convergence.
    - **Likely Follow-up:** *"What problem does Teacher Forcing cause at test/inference time?"*
11. **[DEEP] Q: What is the purpose of the `ExpandMask` custom layer?**
    - **Answer:** In Keras, sequence padding masks are 2D tensors `(batch, seq_len)`. `MultiHeadAttention` requires a 3D tensor `(batch, 1, seq_len)` to broadcast attention weights across multiple attention heads. `ExpandMask` adds the head dimension and casts to boolean.
    - **Likely Follow-up:** *"Why make it a custom Layer instead of a simple Lambda layer?"*
12. **[DEEP] Q: Why use `WarmUpCosine` learning rate scheduling?**
    - **Answer:** A linear warmup over 300 steps prevents large gradient updates from destabilizing randomly initialized attention weights early on. Cosine decay gradually reduces the learning rate to `1e-7`, enabling fine-grained convergence without abrupt step-decay drops.
    - **Likely Follow-up:** *"What optimizer was used with this schedule?"*

---

## SECTION 18 — FOLLOW-UP DRILL-DOWN CHAINS

### Chain 1: Frontend Audio Engineering
1. **Interviewer:** *"How does the browser record and send voice to the server?"*
   - **Candidate:** *"We use the Web Audio API with `ScriptProcessorNode` to capture raw Float32 PCM samples, downsample them to 16 kHz using linear interpolation, encode a 44-byte binary WAV header via `DataView`, and send the file to `/api/transcribe` via HTTP POST."*
2. **Interviewer:** *"Why did you have to write a custom resampler? Doesn't `AudioContext` allow you to set `sampleRate: 16000`?"*
   - **Candidate:** *"While the Web Audio spec allows passing `sampleRate` to `AudioContext`, Chromium on Windows frequently ignores non-native sample rates on input streams or defaults back to the hardware device clock (44.1k/48k). Resampling in software guarantees a strict 16 kHz stream regardless of OS drivers."*
3. **Interviewer:** *"How does your linear resampling algorithm work mathematically?"*
   - **Candidate:** *"We calculate the ratio $R = \text{origRate} / 16000$. For each output index $i$, the source index is $i \cdot R$. We take the floor and ceiling indexes, compute the fractional weight $w = (i \cdot R) - \lfloor i \cdot R \rfloor$, and compute the interpolated value as $x[\lfloor i \cdot R \rfloor] \cdot (1 - w) + x[\lceil i \cdot R \rceil] \cdot w$."*
4. **Interviewer:** *"What is the main limitation of linear interpolation compared to polyphase sinc filtering?"*
   - **Candidate:** *"Linear interpolation acts as a low-order filter, meaning it does not perfectly suppress frequencies above the Nyquist limit (8 kHz for 16 kHz audio), which can introduce slight high-frequency aliasing. However, for speech recognition in Vosk, the acoustic features are concentrated below 4 kHz, so the aliasing has negligible impact on transcription accuracy."*

### Chain 2: Concurrency & Backend Synchronization
1. **Interviewer:** *"How does your backend handle multiple concurrent requests?"*
   - **Candidate:** *"FastAPI handles asynchronous request routing via Uvicorn. However, access to the Keras Transformer model is protected by an `asyncio.Lock()` to serialize inference across requests."*
2. **Interviewer:** *"Why is that lock necessary if FastAPI is single-threaded by default?"*
   - **Candidate:** *"FastAPI runs on an asynchronous event loop. While single-threaded, coroutines yield control whenever they encounter an `await`. If two requests enter the chat endpoint, they could both invoke `model.predict()` concurrently. Because Keras models share internal computational graphs and memory buffers, overlapping forward passes cause tensor buffer corruption."*
3. **Interviewer:** *"What is the performance implication of having an `asyncio.Lock` around your model?"*
   - **Candidate:** *"It turns the model into a single-lane bottleneck. If inference takes 245 ms, the server can only process roughly 4 requests per second. Any additional concurrent requests queue up, linearly increasing wait times."*
4. **Interviewer:** *"How would you eliminate that bottleneck without changing the model architecture?"*
   - **Candidate:** *"I would run multiple Uvicorn worker processes behind an Nginx reverse proxy. Each process maintains its own isolated Python interpreter and model instance in memory. For even higher throughput, I would export the model to ONNX Runtime, which supports thread-safe concurrent inference calls natively."*

### Chain 3: Transformer Architecture & Masking
1. **Interviewer:** *"Walk me through the layers of your custom Transformer."*
   - **Candidate:** *"It's an Encoder-Decoder model. Both sides use a shared 128-dimensional embedding layer, custom learned positional encodings, 4 encoder blocks, and 4 decoder blocks. Each block has 4-head Multi-Head Attention, layer normalization, dropout, and a feed-forward network with GELU activations."*
2. **Interviewer:** *"Why did you use GELU instead of ReLU in the feed-forward network?"*
   - **Candidate:** *"ReLU hard-zeros all negative inputs ($f(x) = \max(0, x)$), which can lead to 'dead neurons' where units stop updating during backpropagation. GELU (Gaussian Error Linear Unit) smooths the activation curve probabilistically based on the standard normal distribution, allowing small negative gradients to flow through and improving Transformer convergence."*
3. **Interviewer:** *"How does causal masking work in your `DecoderBlock`?"*
   - **Candidate:** *"In the decoder's self-attention layer, we generate a lower-triangular boolean matrix using `tf.linalg.band_part(..., -1, 0)`. This sets all positions above the diagonal to false. When combined with the padding mask via `tf.logical_and`, it ensures the model cannot attend to future tokens during training."*
4. **Interviewer:** *"What happens mathematically when that mask is applied inside `MultiHeadAttention`?"*
   - **Candidate:** *"Masked positions are replaced with a large negative value (e.g., $-10^9$) before the softmax operation. Because $e^{-10^9} \approx 0$, the attention weights for future and padded tokens become zero, completely removing their contribution from the weighted sum of value vectors."*

---

## SECTION 19 — WHAT I ABSOLUTELY MUST KNOW

### 🔴 MUST KNOW (Cannot Answer = Looks Like You Didn't Build It)
1. **Exact End-to-End Latency & Model Numbers:** Chatbot inference is ~245 ms; model size is ~32 MB with 2.6M parameters; trained on 7,565 Skyrim dialogue pairs.
2. **Why the Model is Offline:** Cloud APIs introduce 1–3s latency, cost money per token, and require internet access. Games require local, sub-300 ms responses.
3. **Audio Format Requirements:** Vosk strictly requires 16,000 Hz, 1-channel, 16-bit linear PCM WAV. The browser records at 44.1k/48k, requiring client-side linear resampling and binary RIFF WAV encoding.
4. **The `asyncio.Lock` Rationale:** Keras models share internal computational state; concurrent forward passes corrupt tensor buffers. The lock serializes model execution.
5. **No Database Reality:** There is no database. All persistence is file-based (models, vocabs, temporary WAV files) and state is in-memory.
6. **The VOICE Button Event Bug:** Caused by `pointerdown` and `click` event collision combined with Chromium audio driver freezing when streams weren't cleanly stopped with `track.stop()`.

### 🟡 SHOULD KNOW (Likely Follow-Ups)
1. **Causal Masking & Teacher Forcing:** Lower-triangular masking prevents lookahead; teacher forcing feeds ground-truth previous tokens during training.
2. **Why BERTScore vs. BLEU:** BLEU measures exact n-gram overlap and fails on dialogue; BERTScore measures contextual embedding cosine similarity (achieving 0.904).
3. **Path Traversal Security:** `os.path.abspath(filepath)` canonicalization prevents directory escape attacks.
4. **Desktop App Architecture:** Tkinter GUI runs on main thread; background daemon threads handle STT and inference; `root.after(100)` polls thread-safe queues.
5. **Autoplay Policy Workaround:** Browsers block audio until a user gesture; the initial `ENTER THE TAVERN` click unlocks audio contexts.

### 🟢 GOOD TO KNOW (Distinguishes You as an Exceptional Candidate)
1. **ONNX / TensorRT Quantization Roadmap:** Converting models to INT8 ONNX for 3x speedups on edge devices.
2. **Linear Resampling DSP Tradeoffs:** High-frequency aliasing risks of linear interpolation vs. polyphase sinc filtering.
3. **Web Audio Threading:** Difference between `ScriptProcessorNode` (main UI thread) and `AudioWorkletNode` (dedicated audio thread).
4. **Relational Database Design:** Table schemas, foreign keys, and indexes for scaling dialogue history in PostgreSQL.

---

## SECTION 20 — FINAL CHEAT SHEET

- **One-Line Pitch:** A real-time, fully offline voice-activated AI dialogue framework replacing static game dialogue trees with a custom 2.6M parameter Transformer, Vosk STT, and Silero TTS running with sub-300 ms latency.
- **Problem Solved:** Immersion-breaking static dialogue menus and high cloud latency in video games.
- **Architecture Flow:** Browser (React 19) -> Web Audio DSP (16kHz WAV) -> FastAPI (Port 8000) -> Vosk STT (Kaldi) -> Custom Transformer (Keras 2.6M) -> Silero TTS (PyTorch 48kHz) -> HTML5 Audio Playback.
- **Tech Stack & Why:**
  - *FastAPI:* High-throughput asynchronous ASGI web server with automatic Pydantic validation.
  - *Keras:* Custom Encoder-Decoder Transformer with learned positional encoding and causal masking.
  - *Vosk:* Offline ~50 MB Kaldi acoustic recognizer delivering ~140 ms STT on CPU.
  - *Silero:* Offline PyTorch neural speech synthesis generating 48kHz audio directly on CPU.
  - *React 19 + TypeScript:* Modern SPA with custom state machines (`useChat`, `useSpeechRecognition`) and medieval Skyrim aesthetic.
- **Top 3 Flows:**
  1. *Voice Turn:* Mic -> Resample 16kHz -> WAV Encode -> POST `/api/transcribe` -> Vosk -> POST `/api/chat` -> Transformer -> Silero -> Audio Playback.
  2. *Text Turn:* Text input -> Form Submit -> POST `/api/chat` -> Transformer -> Silero -> History Update.
  3. *Tavern Entry:* Intro screen click -> Autoplay unlock -> Scroll notice -> Fadeout music -> Tavern view mount.
- **Database Model:** None. Static model/vocab files on disk; ephemeral client-side React history; temporary WAV audio files.
- **Authentication:** None (local prototype design). Protected via path traversal checks and 5 MB audio size caps.
- **Top 3 Technical Decisions:**
  1. Training a 2.6M parameter Transformer from scratch instead of fine-tuning a massive LLM (sub-300 ms latency on CPU).
  2. Client-side audio resampling and binary WAV encoding (avoids server-side FFmpeg transcoding latency).
  3. `asyncio.Lock` serialization for model inference (prevents concurrent tensor buffer memory corruption).
- **Top 3 Challenges:**
  1. Web audio sample rate and format mismatch with Vosk Kaldi requirements.
  2. VOICE button rapid cutoff caused by pointer/click collision and Chromium driver stalling.
  3. Keras custom layer serialization during model save/load operations.
- **Biggest Bottleneck:** CPU-bound inference serialization via `asyncio.Lock`.
- **Scaling Path:** ONNX INT8 quantization -> Multi-worker Uvicorn processes -> AWS S3 object storage -> Celery task queue with WebSockets.

---

## SECTION 21 — MOCK INTERVIEW MODE

READY FOR MOCK INTERVIEW.

When you are ready to test your knowledge, reply in chat: **"Start mock interview"**.
I will act as a Senior SDE Interviewer and evaluate your responses:
- I will ask **ONE** question at a time.
- I will start with: *"Tell me about this project."*
- I will drill deeper based on your answers using repeated follow-up questions: *Why? Why did you choose that? How does that work internally? Where is that implemented in your code? What happens if it fails? What happens if two users do it simultaneously? How would you scale it?*
- After each answer, I will score you on:
  - **Correctness:** /10
  - **Depth:** /10
  - **Clarity:** /10
- I will explain what you got right, what you missed, and what a stronger fresher-level answer would look like before moving to the next question.
