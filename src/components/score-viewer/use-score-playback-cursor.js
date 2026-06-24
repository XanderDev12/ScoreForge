import { useEffect, useRef } from "react";

const MAX_CURSOR_STEPS = 20_000;
const DEFAULT_BPM = 120;
const QUARTER_NOTES_PER_WHOLE_NOTE = 4;
const CURSOR_VERTICAL_PADDING = 0.5;
const OSMD_UNIT_IN_PIXELS = 10;

export function useScorePlaybackCursor(osmd, playback) {
  const controllerRef = useRef(null);

  useEffect(() => {
    controllerRef.current?.dispose();
    controllerRef.current = osmd ? createCursorController(osmd) : null;

    return () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [osmd]);

  useEffect(() => {
    controllerRef.current?.update(playback);
  }, [
    playback.duration,
    playback.position,
    playback.status,
    playback.timing,
  ]);
}

function createCursorController(osmd) {
  const cursor = osmd.cursor;
  const scoreTimeline = createCursorTimeline(cursor);
  let resolvedTimeline = scoreTimeline.map((entry) => entry.estimatedSeconds);
  let timingReference = null;
  let currentStep = 0;

  cursor.reset();
  cursor.hide();

  return {
    dispose() {
      cursor.hide();
    },
    update({ duration, position, status, timing }) {
      if (!duration || status === "loading" || status === "unavailable" || status === "error") {
        cursor.hide();
        return;
      }

      if (timing && timing !== timingReference) {
        resolvedTimeline = resolveMidiTimeline(scoreTimeline, timing);
        timingReference = timing;
      }

      const targetTimelineIndex = findCursorStep(resolvedTimeline, position);
      const targetStep = scoreTimeline[targetTimelineIndex]?.cursorStep ?? 0;

      if (targetStep < currentStep) {
        cursor.reset();
        currentStep = 0;
      }

      while (currentStep < targetStep && !cursor.Iterator.EndReached) {
        cursor.next();
        currentStep += 1;
      }

      if (status === "ready" && position === 0) {
        cursor.hide();
      } else {
        cursor.show();
        cursor.update();
        stretchCursorAcrossSystem(osmd, cursor);
      }
    },
  };
}

function createCursorTimeline(cursor) {
  const iterator = cursor.Iterator.clone();
  const timeline = [];
  let elapsedSeconds = 0;
  let previousBpm = DEFAULT_BPM;
  let previousTimestamp = null;
  let stagnantSteps = 0;
  let cursorStep = 0;

  while (!iterator.EndReached && timeline.length < MAX_CURSOR_STEPS) {
    const scoreTimestamp = iterator.CurrentEnrolledTimestamp?.RealValue
      ?? iterator.CurrentSourceTimestamp?.RealValue
      ?? timeline.length;

    if (Number.isFinite(scoreTimestamp) && previousTimestamp !== null) {
      const scoreDelta = Math.max(0, scoreTimestamp - previousTimestamp);
      elapsedSeconds += wholeNotesToSeconds(scoreDelta, previousBpm);
    }

    const normalizedTimestamp = Number.isFinite(scoreTimestamp)
      ? scoreTimestamp
      : previousTimestamp ?? 0;
    const previousEntry = timeline[timeline.length - 1];

    if (!previousEntry || normalizedTimestamp > previousEntry.scoreTimestamp) {
      timeline.push({
        cursorStep,
        estimatedSeconds: elapsedSeconds,
        scoreTimestamp: normalizedTimestamp,
      });
    }
    previousTimestamp = Number.isFinite(scoreTimestamp)
      ? scoreTimestamp
      : previousTimestamp;
    previousBpm = normalizeBpm(iterator.CurrentBpm, previousBpm);
    const signature = [
      iterator.CurrentMeasureIndex,
      iterator.CurrentEnrolledTimestamp?.RealValue,
      iterator.CurrentRelativeInMeasureTimestamp?.RealValue,
      iterator.CurrentSourceTimestamp?.RealValue,
    ].join(":");
    iterator.moveToNextVisibleVoiceEntry(false);
    cursorStep += 1;

    const nextSignature = [
      iterator.CurrentMeasureIndex,
      iterator.CurrentEnrolledTimestamp?.RealValue,
      iterator.CurrentRelativeInMeasureTimestamp?.RealValue,
      iterator.CurrentSourceTimestamp?.RealValue,
    ].join(":");

    stagnantSteps = nextSignature === signature ? stagnantSteps + 1 : 0;

    if (stagnantSteps >= 32) {
      break;
    }
  }

  if (timeline.length === 0) {
    return [{ cursorStep: 0, estimatedSeconds: 0, scoreTimestamp: 0 }];
  }

  return timeline;
}

function findCursorStep(timeline, targetTime) {
  const target = Math.max(0, targetTime);
  let low = 0;
  let high = timeline.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if (timeline[middle] <= target) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low;
}

function wholeNotesToSeconds(wholeNotes, bpm) {
  return wholeNotes * QUARTER_NOTES_PER_WHOLE_NOTE * (60 / bpm);
}

function normalizeBpm(bpm, fallbackBpm) {
  return Number.isFinite(bpm) && bpm > 0 ? bpm : fallbackBpm;
}

function resolveMidiTimeline(scoreTimeline, timing) {
  const ppq = Number(timing.ppq);

  if (!Number.isFinite(ppq) || ppq <= 0) {
    return scoreTimeline.map((entry) => entry.estimatedSeconds);
  }

  const firstTimestamp = scoreTimeline[0]?.scoreTimestamp ?? 0;
  const tempos = normalizeTempos(timing.tempos, ppq);

  return scoreTimeline.map((entry) => {
    const wholeNotes = Math.max(0, entry.scoreTimestamp - firstTimestamp);
    const ticks = wholeNotes * QUARTER_NOTES_PER_WHOLE_NOTE * ppq;
    return ticksToSeconds(ticks, tempos, ppq);
  });
}

function normalizeTempos(tempos, ppq) {
  const normalizedTempos = Array.isArray(tempos)
    ? tempos
        .filter((tempo) => {
          return Number.isFinite(tempo.bpm)
            && tempo.bpm > 0
            && Number.isFinite(tempo.ticks);
        })
        .sort((firstTempo, secondTempo) => firstTempo.ticks - secondTempo.ticks)
    : [];

  if (normalizedTempos.length === 0 || normalizedTempos[0].ticks > 0) {
    normalizedTempos.unshift({ bpm: DEFAULT_BPM, ticks: 0 });
  }

  let currentTime = 0;

  return normalizedTempos.map((tempo, index) => {
    if (index > 0) {
      const previousTempo = normalizedTempos[index - 1];
      const elapsedTicks = tempo.ticks - previousTempo.ticks;
      currentTime += (elapsedTicks / ppq) * (60 / previousTempo.bpm);
    }

    return { ...tempo, time: currentTime };
  });
}

function ticksToSeconds(ticks, tempos, ppq) {
  let activeTempo = tempos[0];

  for (let index = 1; index < tempos.length; index += 1) {
    if (tempos[index].ticks > ticks) {
      break;
    }

    activeTempo = tempos[index];
  }

  const elapsedTicks = Math.max(0, ticks - activeTempo.ticks);
  return activeTempo.time + (elapsedTicks / ppq) * (60 / activeTempo.bpm);
}

function stretchCursorAcrossSystem(osmd, cursor) {
  const graphicalNote = cursor.GNotesUnderCursor()[0];
  const musicSystem = graphicalNote
    ?.parentVoiceEntry
    ?.parentStaffEntry
    ?.parentMeasure
    ?.ParentMusicSystem;
  const visibleStaffLines = musicSystem?.StaffLines?.filter((staffLine) => {
    return staffLine.ParentStaff?.isVisible?.() !== false;
  });

  if (!musicSystem || !visibleStaffLines?.length) {
    return;
  }

  const firstStaffLine = visibleStaffLines[0];
  const lastStaffLine = visibleStaffLines[visibleStaffLines.length - 1];
  const systemY = musicSystem.PositionAndShape.AbsolutePosition.y;
  const top = systemY
    + firstStaffLine.PositionAndShape.RelativePosition.y
    - CURSOR_VERTICAL_PADDING;
  const bottom = systemY
    + lastStaffLine.PositionAndShape.RelativePosition.y
    + lastStaffLine.StaffHeight
    + CURSOR_VERTICAL_PADDING;
  const scale = OSMD_UNIT_IN_PIXELS * osmd.Zoom;

  cursor.cursorElement.style.top = `${top * scale}px`;
  cursor.cursorElement.height = Math.max(scale, (bottom - top) * scale);
}
