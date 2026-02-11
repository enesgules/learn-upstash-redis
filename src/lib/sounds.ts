let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("sound-enabled") !== "true";
}

/** Deep bass thump — region selected */
export function playSelectSound() {
  if (isMuted()) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(110, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.08);

  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);

  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.18);
}

/** Low drop — region deselected */
export function playDeselectSound() {
  if (isMuted()) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(150, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.12);

  gain.gain.setValueAtTime(0.18, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);

  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.15);
}

/** Rising bass sweep — adding a read replica connection */
export function playConnectionSound() {
  if (isMuted()) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(100, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(260, c.currentTime + 0.35);

  gain.gain.setValueAtTime(0.12, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);

  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.4);
}

/** Packet launch — client sends write to primary */
export function playPacketSendSound() {
  if (isMuted()) return;
  const c = getCtx();

  // Bass layer
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.connect(gain1);
  gain1.connect(c.destination);
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(90, c.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.25);
  gain1.gain.setValueAtTime(0.15, c.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  osc1.start(c.currentTime);
  osc1.stop(c.currentTime + 0.35);

  // Shimmer layer
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.connect(gain2);
  gain2.connect(c.destination);
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(400, c.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.2);
  gain2.gain.setValueAtTime(0.04, c.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  osc2.start(c.currentTime);
  osc2.stop(c.currentTime + 0.25);
}

/** Confirmation ping — primary acknowledged write */
export function playAckSound() {
  if (isMuted()) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(520, c.currentTime);
  osc.frequency.setValueAtTime(660, c.currentTime + 0.06);

  gain.gain.setValueAtTime(0.1, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);

  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.2);
}

/** Fan-out whoosh — replication starting to replicas */
export function playReplicateSound() {
  if (isMuted()) return;
  const c = getCtx();

  // Low sweep
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.4);
  gain.gain.setValueAtTime(0.1, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.5);

  // Noise-like texture via detuned triangle
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.connect(gain2);
  gain2.connect(c.destination);
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(180, c.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(450, c.currentTime + 0.35);
  osc2.detune.setValueAtTime(50, c.currentTime);
  gain2.gain.setValueAtTime(0.04, c.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  osc2.start(c.currentTime);
  osc2.stop(c.currentTime + 0.4);
}

/** Soft arrival blip — replica received data */
export function playReplicaArriveSound() {
  if (isMuted()) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(440, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(550, c.currentTime + 0.06);

  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);

  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.12);
}

/** Two-tone chime — response data arrived back at client */
export function playResponseSound() {
  if (isMuted()) return;
  const c = getCtx();

  // First note (high)
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.connect(gain1);
  gain1.connect(c.destination);
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(660, c.currentTime);
  gain1.gain.setValueAtTime(0.1, c.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  osc1.start(c.currentTime);
  osc1.stop(c.currentTime + 0.15);

  // Second note (higher, slightly delayed)
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.connect(gain2);
  gain2.connect(c.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(880, c.currentTime + 0.08);
  gain2.gain.setValueAtTime(0, c.currentTime);
  gain2.gain.setValueAtTime(0.08, c.currentTime + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  osc2.start(c.currentTime + 0.08);
  osc2.stop(c.currentTime + 0.25);
}

/** Descending tone — stale read detected */
export function playStaleSound() {
  if (isMuted()) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(440, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, c.currentTime + 0.25);

  gain.gain.setValueAtTime(0.08, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);

  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.3);
}

/** Harsh descending alarm — primary failure */
export function playFailureAlarmSound() {
  if (isMuted()) return;
  const c = getCtx();

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(600, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.4);
  gain.gain.setValueAtTime(0.08, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.5);

  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.connect(gain2);
  gain2.connect(c.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(80, c.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.3);
  gain2.gain.setValueAtTime(0.15, c.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  osc2.start(c.currentTime);
  osc2.stop(c.currentTime + 0.35);
}

/** Rapid pulsing beeps — election voting */
export function playElectionPulseSound() {
  if (isMuted()) return;
  const c = getCtx();

  for (let i = 0; i < 3; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(300 + i * 80, c.currentTime + i * 0.12);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.setValueAtTime(0.08, c.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.1);
    osc.start(c.currentTime + i * 0.12);
    osc.stop(c.currentTime + i * 0.12 + 0.1);
  }
}

/** Rising major resolution — new leader elected / recovery */
export function playRecoveryChimeSound() {
  if (isMuted()) return;
  const c = getCtx();

  const notes = [440, 554, 659];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, c.currentTime + i * 0.1);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.setValueAtTime(0.07, c.currentTime + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.1 + 0.3);
    osc.start(c.currentTime + i * 0.1);
    osc.stop(c.currentTime + i * 0.1 + 0.3);
  });
}
