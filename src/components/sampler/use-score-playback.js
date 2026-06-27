import { useEffect, useRef, useState } from "react";
import { createMidiPlaybackEngine } from "../../lib/audio/midi-playback-engine.js";
import { loadScoreMusicXml } from "../../lib/audio/load-score-musicxml.js";
import { scoreTimestampToPlaybackSeconds } from "../../lib/audio/score-timing.js";

export function useScorePlayback(musicXmlUrl, tempoPercent) {
  const abortControllerRef = useRef(null);
  const enginePromiseRef = useRef(null);
  const engineRef = useRef(null);
  const loadVersionRef = useRef(0);
  const sequencePromiseRef = useRef(null);
  const sequenceRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [position, setPosition] = useState(0);
  const [status, setStatus] = useState(musicXmlUrl ? "idle" : "unavailable");
  const [timing, setTiming] = useState(null);

  useEffect(() => {
    const loadVersion = loadVersionRef.current + 1;
    loadVersionRef.current = loadVersion;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    sequenceRef.current = null;
    sequencePromiseRef.current = null;
    engineRef.current?.dispose();
    engineRef.current = null;
    enginePromiseRef.current = null;
    setDuration(0);
    setError("");
    setPosition(0);
    setTiming(null);

    if (!musicXmlUrl) {
      setStatus("unavailable");
      return () => {
        invalidateLoad(loadVersionRef, loadVersion);
      };
    }

    setStatus("idle");

    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      invalidateLoad(loadVersionRef, loadVersion);
      engineRef.current?.dispose();
      engineRef.current = null;
      enginePromiseRef.current = null;
    };
  }, [musicXmlUrl]);

  useEffect(() => {
    engineRef.current?.setTempoPercent(tempoPercent);
  }, [tempoPercent]);

  async function togglePlayback() {
    const playbackVersion = loadVersionRef.current;

    try {
      if (status === "playing") {
        engineRef.current?.pause();
        return;
      }

      const engine = await getOrCreateEngine();

      if (engine) {
        await engine.play();
      }
    } catch (playbackError) {
      if (loadVersionRef.current !== playbackVersion) {
        return;
      }

      console.error("Unable to start score playback", playbackError);
      setError("Audio could not start");
      setStatus("error");
    }
  }

  async function seekBy(offsetSeconds) {
    const playbackVersion = loadVersionRef.current;

    try {
      const engine = await getOrCreateEngine();
      engine?.seekBy(offsetSeconds);
    } catch (playbackError) {
      handlePlaybackError(playbackError, playbackVersion);
    }
  }

  async function seekToScoreTimestamp(scoreTimestamp) {
    const playbackVersion = loadVersionRef.current;

    try {
      const engine = await getOrCreateEngine();
      const sequence = sequenceRef.current;

      if (engine && sequence) {
        engine.seekTo(
          scoreTimestampToPlaybackSeconds(
            scoreTimestamp,
            sequence.timing,
          ),
        );
      }
    } catch (playbackError) {
      handlePlaybackError(playbackError, playbackVersion);
    }
  }

  async function getOrCreateEngine() {
    if (engineRef.current) {
      return engineRef.current;
    }

    if (enginePromiseRef.current) {
      return enginePromiseRef.current;
    }

    const sequence = await getOrLoadSequence();

    if (!sequence) {
      return null;
    }

    const loadVersion = loadVersionRef.current;
    setStatus("starting");
    const enginePromise = createMidiPlaybackEngine(sequence, {
      onProgress: ({
        duration: nextDuration,
        position: nextPosition,
        timing: nextTiming,
      }) => {
        if (loadVersionRef.current !== loadVersion) {
          return;
        }

        setDuration(nextDuration);
        setPosition(nextPosition);
        setTiming(nextTiming);
      },
      onStateChange: (nextStatus) => {
        if (loadVersionRef.current === loadVersion) {
          setStatus(nextStatus);
        }
      },
    });
    enginePromiseRef.current = enginePromise;
    let engine;

    try {
      engine = await enginePromise;
    } finally {
      if (enginePromiseRef.current === enginePromise) {
        enginePromiseRef.current = null;
      }
    }

    if (loadVersionRef.current !== loadVersion) {
      engine.dispose();
      return null;
    }

    engine.setTempoPercent(tempoPercent);
    engineRef.current = engine;
    return engine;
  }

  async function getOrLoadSequence() {
    if (sequenceRef.current) {
      return sequenceRef.current;
    }

    if (sequencePromiseRef.current) {
      return sequencePromiseRef.current;
    }

    if (!musicXmlUrl) {
      return null;
    }

    const loadVersion = loadVersionRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setError("");
    setStatus("loading");

    const sequencePromise = loadScoreMusicXml(musicXmlUrl, {
      signal: controller.signal,
    }).then((sequence) => {
      if (loadVersionRef.current !== loadVersion) {
        return null;
      }

      sequenceRef.current = sequence;
      setDuration(sequence.duration);
      setStatus("ready");
      setTiming(sequence.timing);
      return sequence;
    });
    sequencePromiseRef.current = sequencePromise;

    try {
      return await sequencePromise;
    } finally {
      if (sequencePromiseRef.current === sequencePromise) {
        sequencePromiseRef.current = null;
      }

      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }

  function handlePlaybackError(playbackError, playbackVersion) {
    if (loadVersionRef.current !== playbackVersion) {
      return;
    }

    console.error("Unable to prepare score playback", playbackError);
    setError("Audio unavailable");
    setStatus("error");
  }

  return {
    duration,
    error,
    position,
    seekBy,
    seekToScoreTimestamp,
    status,
    timing,
    togglePlayback,
  };
}

function invalidateLoad(loadVersionRef, loadVersion) {
  if (loadVersionRef.current === loadVersion) {
    loadVersionRef.current += 1;
  }
}
