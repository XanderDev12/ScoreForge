import { parseMidiSequence } from "./parse-midi-sequence.js";
import { fetchScoreSource } from "../scores/fetch-score-source.js";

const MAX_MUSICXML_BYTES = 12 * 1024 * 1024;
let verovioRuntimePromise;

export async function loadScoreMusicXml(url, { signal } = {}) {
  const { data: musicXmlData } = await fetchScoreSource(url, {
    maxBytes: MAX_MUSICXML_BYTES,
    signal,
  });

  const midiData = await convertMusicXmlToMidi(musicXmlData);
  return parseMidiSequence(midiData);
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

    const midiBase64 = toolkit.renderToMIDI();

    if (!midiBase64) {
      throw new Error("MusicXML did not produce playable MIDI data");
    }

    return decodeBase64(midiBase64);
  } finally {
    toolkit.destroy();
  }
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
