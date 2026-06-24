import { createInstrumentSynths } from "./instrument-synth-factory.js";

const DEFAULT_TEMPO_PERCENT = 100;
const PROGRESS_INTERVAL_MS = 100;

export async function createMidiPlaybackEngine(sequence, callbacks = {}) {
  const Tone = await import("tone");

  return new MidiPlaybackEngine(Tone, sequence, callbacks);
}

class MidiPlaybackEngine {
  constructor(Tone, sequence, callbacks) {
    this.Tone = Tone;
    this.sequence = sequence;
    this.callbacks = callbacks;
    this.position = 0;
    this.startedAt = 0;
    this.state = "ready";
    this.tempoPercent = DEFAULT_TEMPO_PERCENT;
    this.part = null;
    this.progressTimer = null;
    this.transport = Tone.getTransport();
    this.synths = createInstrumentSynths(Tone, sequence.instrumentFamilies);
    this.emitProgress();
  }

  async play() {
    if (this.state === "playing") {
      return;
    }

    await this.Tone.start();

    if (this.position >= this.sequence.duration) {
      this.position = 0;
    }

    this.startSchedule();
    this.setState("playing");
  }

  pause() {
    if (this.state !== "playing") {
      return;
    }

    this.capturePosition();
    this.stopSchedule();
    this.setState("paused");
    this.emitProgress();
  }

  stop() {
    this.stopSchedule();
    this.position = 0;
    this.setState("ready");
    this.emitProgress();
  }

  seekBy(offsetSeconds) {
    this.seekTo(this.position + Number(offsetSeconds || 0));
  }

  seekTo(nextPosition) {
    const wasPlaying = this.state === "playing";

    if (wasPlaying) {
      this.capturePosition();
      this.stopSchedule();
    }

    this.position = clamp(Number(nextPosition), 0, this.sequence.duration);

    if (this.position >= this.sequence.duration) {
      this.setState("ended");
    } else if (wasPlaying) {
      this.startSchedule();
    } else {
      this.setState(this.position > 0 ? "paused" : "ready");
    }

    this.emitProgress();
  }

  setTempoPercent(nextTempoPercent) {
    const normalizedTempo = clamp(Number(nextTempoPercent), 25, 400);

    if (normalizedTempo === this.tempoPercent) {
      return;
    }

    const wasPlaying = this.state === "playing";

    if (wasPlaying) {
      this.capturePosition();
      this.stopSchedule();
    }

    this.tempoPercent = normalizedTempo;

    if (wasPlaying) {
      this.startSchedule();
    }

    this.emitProgress();
  }

  dispose() {
    this.stopSchedule();
    this.synths.forEach((synth) => synth.dispose());
    this.synths.clear();
    this.callbacks = {};
    this.state = "disposed";
  }

  startSchedule() {
    const playbackRate = this.tempoPercent / 100;
    const events = createRemainingEvents(this.sequence.notes, this.position);

    this.stopSchedule();
    this.transport.cancel();
    this.transport.stop();
    this.transport.seconds = 0;
    this.part = new this.Tone.Part((time, note) => {
      const synth = this.synths.get(note.instrumentFamily)
        ?? this.synths.values().next().value;
      synth?.triggerAttackRelease(
        note.name,
        note.duration / playbackRate,
        time,
        note.velocity,
      );
    }, events);
    this.part.playbackRate = playbackRate;
    this.part.start(0);
    this.startedAt = this.Tone.now();
    this.transport.start();
    this.progressTimer = window.setInterval(() => {
      this.capturePosition();
      this.emitProgress();

      if (this.position >= this.sequence.duration) {
        this.finishPlayback();
      }
    }, PROGRESS_INTERVAL_MS);
  }

  stopSchedule() {
    if (this.progressTimer !== null) {
      window.clearInterval(this.progressTimer);
      this.progressTimer = null;
    }

    this.part?.dispose();
    this.part = null;
    this.transport.stop();
    this.transport.cancel();
    this.synths.forEach((synth) => synth.releaseAll());
  }

  capturePosition() {
    if (this.state !== "playing") {
      return;
    }

    const elapsed = Math.max(0, this.Tone.now() - this.startedAt);
    this.position = Math.min(
      this.sequence.duration,
      this.position + elapsed * (this.tempoPercent / 100),
    );
    this.startedAt = this.Tone.now();
  }

  finishPlayback() {
    this.stopSchedule();
    this.position = this.sequence.duration;
    this.setState("ended");
    this.emitProgress();
  }

  setState(nextState) {
    this.state = nextState;
    this.callbacks.onStateChange?.(nextState);
  }

  emitProgress() {
    this.callbacks.onProgress?.({
      duration: this.sequence.duration,
      position: this.position,
      timing: this.sequence.timing,
    });
  }
}

function createRemainingEvents(notes, position) {
  return notes
    .filter((note) => note.time + note.duration > position)
    .map((note) => {
      const startsBeforePosition = note.time < position;

      return {
        ...note,
        duration: startsBeforePosition
          ? note.time + note.duration - position
          : note.duration,
        time: Math.max(0, note.time - position),
      };
    });
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
