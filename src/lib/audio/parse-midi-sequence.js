import * as midiModule from "@tonejs/midi";

const MAX_MIDI_DURATION_SECONDS = 2 * 60 * 60;
const MAX_MIDI_NOTES = 75000;
const MAX_SUSTAINED_NOTE_SECONDS = 12;
const SUSTAIN_CONTROLLER = 64;
const SUSTAIN_DOWN_THRESHOLD = 0.5;

const midiPackage = midiModule.default ?? midiModule;
const Midi = midiModule.Midi ?? midiPackage?.Midi;

export function parseMidiSequence(midiData, { instrumentHints = [] } = {}) {
  if (!Midi) {
    throw new Error("MIDI parser is unavailable");
  }

  const midi = new Midi(midiData);
  const instrumentFamilies = new Set();
  const notes = [];
  let sustainEventCount = 0;

  for (const [trackIndex, track] of midi.tracks.entries()) {
    const instrumentFamily = getInstrumentFamily(track, trackIndex, instrumentHints);
    instrumentFamilies.add(instrumentFamily);
    const sustainEvents = getSustainEvents(track);
    const sustainIntervals = getSustainIntervals(sustainEvents, midi.duration);
    sustainEventCount += sustainEvents.length;

    for (const note of track.notes) {
      notes.push(toPlaybackNote(note, sustainIntervals, instrumentFamily));

      if (notes.length > MAX_MIDI_NOTES) {
        throw new Error("Score contains too many notes to play safely");
      }
    }
  }

  notes.sort((first, second) => first.time - second.time);
  const duration = notes.reduce((latestEnd, note) => {
    return Math.max(latestEnd, note.time + note.duration);
  }, midi.duration);

  if (duration > MAX_MIDI_DURATION_SECONDS) {
    throw new Error("Score duration is too long to play safely");
  }

  return {
    duration,
    instrumentFamilies: [...instrumentFamilies],
    notes,
    sustainEventCount,
    timing: {
      ppq: midi.header.ppq,
      tempos: midi.header.tempos.map((tempo) => ({
        bpm: tempo.bpm,
        ticks: tempo.ticks,
      })),
    },
    trackCount: midi.tracks.length,
  };
}

function getSustainEvents(track) {
  const events =
    track.controlChanges?.[SUSTAIN_CONTROLLER] ??
    track.controlChanges?.sustain ??
    [];

  return [...events].sort((first, second) => first.time - second.time);
}

function getSustainIntervals(events, scoreDuration) {
  const intervals = [];
  let pedalDownAt = null;

  for (const event of events) {
    const isPedalDown = event.value >= SUSTAIN_DOWN_THRESHOLD;

    if (isPedalDown && pedalDownAt === null) {
      pedalDownAt = event.time;
      continue;
    }

    if (!isPedalDown && pedalDownAt !== null) {
      intervals.push({ end: event.time, start: pedalDownAt });
      pedalDownAt = null;
    }
  }

  if (pedalDownAt !== null) {
    intervals.push({ end: scoreDuration, start: pedalDownAt });
  }

  return intervals;
}

function toPlaybackNote(note, sustainIntervals, instrumentFamily) {
  const noteEnd = note.time + note.duration;
  const sustainInterval = findSustainInterval(sustainIntervals, noteEnd);
  const sustainedEnd = sustainInterval?.end ?? noteEnd;

  return {
    duration: Math.max(
      0.02,
      Math.min(sustainedEnd - note.time, MAX_SUSTAINED_NOTE_SECONDS),
    ),
    instrumentFamily,
    name: note.name,
    time: note.time,
    velocity: clamp(note.velocity, 0.05, 1),
  };
}

function getInstrumentFamily(track, trackIndex, instrumentHints) {
  if (track.instrument?.percussion) {
    return "percussion";
  }

  const midiFamily = track.instrument?.family?.trim().toLowerCase();

  if (midiFamily && midiFamily !== "piano") {
    return midiFamily;
  }

  const channelHint = instrumentHints.find((hint) => {
    return hint.family && hint.channel === track.channel;
  });
  const positionalHint = instrumentHints[trackIndex];

  return channelHint?.family || positionalHint?.family || midiFamily || "piano";
}

function findSustainInterval(intervals, time) {
  let left = 0;
  let right = intervals.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const interval = intervals[middle];

    if (time < interval.start) {
      right = middle - 1;
    } else if (time >= interval.end) {
      left = middle + 1;
    } else {
      return interval;
    }
  }

  return null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
