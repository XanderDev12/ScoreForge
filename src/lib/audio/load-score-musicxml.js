import { parseMidiSequence } from "./parse-midi-sequence.js";
import { fetchScoreSource } from "../scores/fetch-score-source.js";

const MAX_MUSICXML_BYTES = 12 * 1024 * 1024;
let verovioRuntimePromise;

export async function loadScoreMusicXml(url, { signal } = {}) {
  const { data: musicXmlData } = await fetchScoreSource(url, {
    maxBytes: MAX_MUSICXML_BYTES,
    signal,
  });

  const { instrumentHints, midiData } = await convertMusicXmlToMidi(musicXmlData);
  return parseMidiSequence(midiData, { instrumentHints });
}

async function convertMusicXmlToMidi(musicXmlData) {
  const { VerovioToolkit, verovioModule } = await loadVerovio();
  const toolkit = new VerovioToolkit(verovioModule);

  try {
    toolkit.setOptions({ breaks: "none", inputFrom: "xml" });
    const loaded = isZipData(musicXmlData)
      ? toolkit.loadZipDataBuffer(musicXmlData)
      : toolkit.loadData(new TextDecoder().decode(musicXmlData));

    if (!loaded) {
      throw new Error("MusicXML could not be converted for playback");
    }

    const instrumentHints = getScoreInstrumentHints(toolkit);
    const midiBase64 = toolkit.renderToMIDI();

    if (!midiBase64) {
      throw new Error("MusicXML did not produce playable MIDI data");
    }

    return {
      instrumentHints,
      midiData: decodeBase64(midiBase64),
    };
  } finally {
    toolkit.destroy();
  }
}

function getScoreInstrumentHints(toolkit) {
  try {
    const mei = toolkit.getMEI({ scoreBased: true });
    const document = new DOMParser().parseFromString(mei, "application/xml");

    if (document.querySelector("parsererror")) {
      return [];
    }

    return [...document.querySelectorAll("staffDef")].map((staffDefinition) => {
      const instrumentDefinition = staffDefinition.querySelector("instrDef");
      const label = staffDefinition.getAttribute("label")
        || staffDefinition.querySelector("label")?.textContent
        || "";
      const midiProgram = getNumericAttribute(
        instrumentDefinition ?? staffDefinition,
        "midi.instrnum",
      );

      return {
        channel: getNumericAttribute(
          instrumentDefinition ?? staffDefinition,
          "midi.channel",
        ),
        family: inferInstrumentFamily(label, midiProgram),
        staffNumber: getNumericAttribute(staffDefinition, "n"),
      };
    });
  } catch {
    return [];
  }
}

function inferInstrumentFamily(label, midiProgram) {
  const normalizedLabel = label.trim().toLowerCase();
  const labelFamilies = [
    ["percussion", /drum|percussion|timpani|cymbal|snare|tambour|triangle/],
    ["strings", /violin|viola|violoncello|cello|contrabass|double bass|harp|string/],
    ["brass", /trumpet|trombone|tuba|cornet|flugel|euphonium|\bhorn\b|brass/],
    ["reed", /oboe|clarinet|bassoon|sax|reed/],
    ["pipe", /flute|piccolo|recorder|whistle|pipe/],
    ["organ", /organ|harmonium|accordion/],
    ["guitar", /guitar|lute|mandolin|banjo/],
    ["bass", /electric bass|acoustic bass|synth bass/],
    ["ensemble", /choir|voice|vocal|ensemble/],
    ["chromatic percussion", /celesta|glockenspiel|vibraphone|marimba|xylophone|tubular bell/],
    ["piano", /piano|keyboard|clavichord|harpsichord/],
  ];
  const labelMatch = labelFamilies.find(([, pattern]) => pattern.test(normalizedLabel));

  if (labelMatch) {
    return labelMatch[0];
  }

  if (!Number.isFinite(midiProgram)) {
    return null;
  }

  const program = Math.max(0, midiProgram > 127 ? midiProgram - 1 : midiProgram);
  const familyIndex = Math.min(15, Math.floor(program / 8));

  return [
    "piano",
    "chromatic percussion",
    "organ",
    "guitar",
    "bass",
    "strings",
    "ensemble",
    "brass",
    "reed",
    "pipe",
    "synth lead",
    "synth pad",
    "synth effects",
    "world",
    "percussion",
    "sound effects",
  ][familyIndex];
}

function getNumericAttribute(element, attributeName) {
  const rawValue = element?.getAttribute(attributeName);

  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return null;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

async function loadVerovio() {
  if (!verovioRuntimePromise) {
    verovioRuntimePromise = Promise.all([
      import("verovio/esm"),
      import("verovio/wasm"),
    ]).then(async ([toolkitModule, wasmModule]) => ({
      VerovioToolkit: toolkitModule.VerovioToolkit,
      verovioModule: await wasmModule.default(),
    }));
  }

  return verovioRuntimePromise;
}

function isZipData(data) {
  const bytes = new Uint8Array(data, 0, Math.min(data.byteLength, 4));
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}
