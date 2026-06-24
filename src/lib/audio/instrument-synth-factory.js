const MAX_TOTAL_POLYPHONY = 64;
const DEFAULT_FAMILY = "piano";

export function createInstrumentSynths(Tone, instrumentFamilies = []) {
  const families = instrumentFamilies.length > 0
    ? instrumentFamilies
    : [DEFAULT_FAMILY];
  const polyphony = Math.max(
    4,
    Math.min(32, Math.floor(MAX_TOTAL_POLYPHONY / families.length)),
  );
  const outputVolume = -10 - Math.max(0, families.length - 1) * 2;

  return new Map(
    families.map((family) => [
      family,
      createInstrumentSynth(Tone, family, polyphony, outputVolume),
    ]),
  );
}

function createInstrumentSynth(Tone, family, polyphony, outputVolume) {
  const preset = getInstrumentPreset(Tone, family);
  const synth = new Tone.PolySynth(preset.voice).toDestination();
  synth.maxPolyphony = polyphony;
  synth.volume.value = outputVolume + preset.volumeOffset;
  synth.set(preset.options);
  return synth;
}

function getInstrumentPreset(Tone, family) {
  if (family === "piano") {
    return {
      options: {
        harmonicity: 1.5,
        modulationIndex: 1.2,
        oscillator: { type: "sine" },
        envelope: { attack: 0.002, decay: 1.2, sustain: 0.12, release: 1.6 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.4 },
      },
      voice: Tone.FMSynth,
      volumeOffset: 0,
    };
  }

  if (family === "percussion") {
    return {
      options: {
        envelope: { attack: 0.001, decay: 0.28, sustain: 0.01, release: 0.35 },
        octaves: 5,
        pitchDecay: 0.035,
      },
      voice: Tone.MembraneSynth,
      volumeOffset: -2,
    };
  }

  if (family === "chromatic percussion") {
    return {
      options: {
        harmonicity: 3.5,
        modulationIndex: 5,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.35, sustain: 0.05, release: 0.5 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
      },
      voice: Tone.FMSynth,
      volumeOffset: -2,
    };
  }

  if (family === "organ") {
    return {
      options: {
        harmonicity: 2,
        oscillator: { type: "sine" },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.35 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.3 },
      },
      voice: Tone.AMSynth,
      volumeOffset: -3,
    };
  }

  if (family === "strings" || family === "ensemble") {
    return synthPreset(Tone, "sawtooth", {
      attack: 0.12,
      decay: 0.35,
      sustain: 0.68,
      release: 1.5,
    }, -5);
  }

  if (family === "brass") {
    return synthPreset(Tone, "sawtooth", {
      attack: 0.04,
      decay: 0.18,
      sustain: 0.72,
      release: 0.5,
    }, -5);
  }

  if (family === "reed" || family === "pipe") {
    return synthPreset(Tone, "square", {
      attack: 0.035,
      decay: 0.14,
      sustain: 0.62,
      release: 0.45,
    }, -7);
  }

  if (family === "guitar" || family === "bass") {
    return synthPreset(Tone, family === "bass" ? "square" : "triangle", {
      attack: 0.004,
      decay: 0.42,
      sustain: 0.22,
      release: 0.65,
    }, -3);
  }

  if (family.startsWith("synth")) {
    return synthPreset(Tone, "sawtooth", {
      attack: 0.015,
      decay: 0.25,
      sustain: 0.5,
      release: 0.7,
    }, -5);
  }

  return synthPreset(Tone, "triangle", {
    attack: 0.008,
    decay: 0.3,
    sustain: 0.4,
    release: 0.9,
  }, -4);
}

function synthPreset(Tone, oscillatorType, envelope, volumeOffset) {
  return {
    options: {
      envelope,
      oscillator: { type: oscillatorType },
    },
    voice: Tone.Synth,
    volumeOffset,
  };
}
