// Speech input. Two engines behind one function, listenVoice():
//   - "browser": the Web Speech API (works with no keys; Chrome is best)
//   - "bhashini": records a short clip and sends it to the server (POST /api/voice/stt), used only when the server
//     says it is set up (GET /api/voice/engine). If Bhashini fails for any reason we fall back to the browser engine.
export const sttSupported = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export function listen(code, onInterim) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new SR();
  r.lang = code; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
  let finalText = '';
  const promise = new Promise((resolve, reject) => {
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { const x = e.results[i]; if (x.isFinal) finalText += x[0].transcript + ' '; else interim += x[0].transcript; }
      onInterim?.((finalText + interim).trim());
    };
    r.onerror = (e) => reject(Object.assign(new Error(e.error), { code: e.error }));
    r.onend = () => resolve(finalText.trim());
    try { r.start(); } catch (e) { reject(e); }
  });
  return { promise, stop: () => { try { r.stop(); } catch { /* already stopped */ } }, abort: () => { try { r.abort(); } catch { /* already stopped */ } } };
}

// ---- which engine the server offers (asked once; any failure means "browser") ----
let engineP = null;
const engine = () => (engineP ||= fetch('/api/voice/engine').then((r) => (r.ok ? r.json() : { stt: 'browser' })).catch(() => ({ stt: 'browser' })));
const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
export const voiceReady = async () => sttSupported() || ((await engine()).stt === 'bhashini' && canRecord());

// ---- Bhashini: record until the person stops talking (or taps stop), then send the clip ----
const MAX_MS = 12000, QUIET_MS = 1400, NO_SPEECH_MS = 6000, LEVEL = 0.02;
function recordAndSend(lang, onInterim) {
  let rec = null, stream = null, ctx = null, tick = null, aborted = false;
  const cleanup = () => { clearInterval(tick); stream?.getTracks().forEach((t) => t.stop()); ctx?.close().catch(() => {}); };
  const promise = new Promise((resolve, reject) => {
    (async () => {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { return reject(Object.assign(new Error(e.name), { code: e.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture' })); }
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const chunks = [];
      rec = new MediaRecorder(stream, { ...(mime && { mimeType: mime }), audioBitsPerSecond: 24000 }); // small clips: the API body limit is 200 KB
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        cleanup();
        if (aborted) return resolve('');
        const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
        if (!blob.size) return resolve('');
        try {
          const b64 = await new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1]); f.onerror = no; f.readAsDataURL(blob); });
          const r = await fetch('/api/voice/stt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: b64, mime: blob.type, lang }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || 'stt');
          resolve(String(j.text || '').trim());
        } catch { reject(Object.assign(new Error('bhashini'), { code: 'bhashini-failed' })); }
      };
      // stop by itself after a pause in speech
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.fftSize), t0 = Date.now(); let lastVoice = 0;
        tick = setInterval(() => {
          an.getByteTimeDomainData(buf);
          let sum = 0; for (const v of buf) { const x = (v - 128) / 128; sum += x * x; }
          const now = Date.now();
          if (Math.sqrt(sum / buf.length) > LEVEL) lastVoice = now;
          const quiet = lastVoice ? now - lastVoice > QUIET_MS : now - t0 > NO_SPEECH_MS;
          if (quiet || now - t0 > MAX_MS) { clearInterval(tick); if (rec.state !== 'inactive') rec.stop(); }
        }, 150);
      } catch { setTimeout(() => rec.state !== 'inactive' && rec.stop(), MAX_MS); }
      onInterim?.('…');
      rec.start();
    })();
  });
  return {
    promise,
    stop: () => { if (rec && rec.state !== 'inactive') rec.stop(); },
    abort: () => { aborted = true; if (rec && rec.state !== 'inactive') rec.stop(); else cleanup(); }
  };
}

// listenVoice({ speech: 'hi-IN', lang: 'hi', onInterim }) -> { promise -> text, stop, abort }
// Same shape as listen(), so callers do not care which engine ran.
export function listenVoice({ speech, lang, onInterim }) {
  let cur = null, dead = false;
  const promise = (async () => {
    if (canRecord() && (await engine()).stt === 'bhashini') {
      if (dead) return '';
      cur = recordAndSend(String(lang).split('-')[0], onInterim);
      try { return await cur.promise; }
      catch (e) { if (dead || e.code !== 'bhashini-failed' || !sttSupported()) throw e; /* otherwise fall back to the browser below */ }
    }
    if (dead) return '';
    cur = listen(speech, onInterim);
    return cur.promise;
  })();
  return { promise, stop: () => cur?.stop(), abort: () => { dead = true; cur?.abort(); } };
}
