class SpeechService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private silenceGain: GainNode | null = null;
  private audioChunks: Float32Array[] = [];
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;

  private cleanupAudio() {
    try {
      if (this.scriptProcessor) {
        this.scriptProcessor.onaudioprocess = null;
        this.scriptProcessor.disconnect();
        this.scriptProcessor = null;
      }
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      if (this.silenceGain) {
        this.silenceGain.disconnect();
        this.silenceGain = null;
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn("Error stopping microphone track:", e);
          }
        });
        this.mediaStream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
      }
    } catch (err) {
      console.warn("Audio cleanup error:", err);
    }
  }

  async startRecording(): Promise<void> {
    // Cleanly stop any existing recording session and reset hardware streams
    this.cleanupAudio();
    this.audioChunks = [];
    this.isRecording = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone API not supported by browser");
    }

    // Always acquire a fresh MediaStream for each voice session
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } 
    });

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 4096 buffer size, 1 input channel, 1 output channel
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      this.audioChunks.push(new Float32Array(inputData));
    };

    // 0-gain node connected to destination so audio clock processes data without speaker echo
    this.silenceGain = this.audioContext.createGain();
    this.silenceGain.gain.value = 0;

    this.source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.silenceGain);
    this.silenceGain.connect(this.audioContext.destination);

    this.isRecording = true;
    this.recordingStartTime = Date.now();
  }

  async stopRecording(): Promise<Blob | null> {
    if (!this.isRecording) {
      this.cleanupAudio();
      return null;
    }

    this.isRecording = false;
    const duration = Date.now() - this.recordingStartTime;
    const origSampleRate = this.audioContext ? this.audioContext.sampleRate : 48000;

    // Snapshot collected chunks
    const chunks = [...this.audioChunks];
    this.audioChunks = [];

    // Cleanly release microphone hardware stream and audio context between sessions
    this.cleanupAudio();

    // If recording was less than 300ms or no audio was collected, return null
    if (chunks.length === 0 || duration < 300) {
      return null;
    }

    // Merge chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    // Quick RMS check to avoid transcribing pure dead air / silent streams
    let sumSquares = 0;
    for (let i = 0; i < mergedSamples.length; i++) {
      sumSquares += mergedSamples[i] * mergedSamples[i];
    }
    const rms = Math.sqrt(sumSquares / mergedSamples.length);
    console.log(`[SpeechService] Finished session: ${duration}ms, ${chunks.length} chunks, RMS: ${rms.toFixed(5)}`);

    if (rms < 0.00001) {
      console.warn("[SpeechService] Audio is pure silence, RMS < 0.00001");
      return null;
    }

    // Resample from hardware sample rate to 16000 Hz for Vosk
    const samples16k = this.resampleTo16k(mergedSamples, origSampleRate);

    // Create WAV
    return this.encodeWAV(samples16k, 16000);
  }

  // Full reset if needed
  public resetMicrophone() {
    this.isRecording = false;
    this.cleanupAudio();
    this.audioChunks = [];
  }
  
  private resampleTo16k(audioData: Float32Array, origSampleRate: number): Float32Array {
    if (origSampleRate === 16000) return audioData;
    const ratio = origSampleRate / 16000;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const origIndex = i * ratio;
      const indexFloor = Math.floor(origIndex);
      const indexCeil = Math.min(audioData.length - 1, Math.ceil(origIndex));
      const weight = origIndex - indexFloor;
      result[i] = audioData[indexFloor] * (1 - weight) + audioData[indexCeil] * weight;
    }
    return result;
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    /* RIFF identifier */
    this.writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    this.writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    this.writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw PCM) */
    view.setUint16(20, 1, true);
    /* channel count (mono) */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    this.writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    // Float to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    
    return new Blob([view], { type: 'audio/wav' });
  }
  
  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.wav');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const BASE_URL = '';
    try {
      const response = await fetch(`${BASE_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`STT error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return (data.text || '').trim();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const speechService = new SpeechService();
