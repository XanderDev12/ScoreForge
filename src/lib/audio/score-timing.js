const DEFAULT_BPM = 120;
const QUARTER_NOTES_PER_WHOLE_NOTE = 4;

export function scoreTimestampToPlaybackSeconds(
  scoreTimestamp,
  timing,
  originTimestamp = 0,
) {
  const wholeNotes = Math.max(0, Number(scoreTimestamp) - Number(originTimestamp));
  const ppq = Number(timing?.ppq);

  if (!Number.isFinite(ppq) || ppq <= 0) {
    return wholeNotesToSeconds(wholeNotes, DEFAULT_BPM);
  }

  const ticks = wholeNotes * QUARTER_NOTES_PER_WHOLE_NOTE * ppq;
  return ticksToSeconds(ticks, normalizeTempos(timing.tempos, ppq), ppq);
}

export function resolveScoreTimeline(scoreTimeline, timing) {
  const ppq = Number(timing?.ppq);

  if (!Number.isFinite(ppq) || ppq <= 0) {
    return scoreTimeline.map((entry) => entry.estimatedSeconds);
  }

  const firstTimestamp = scoreTimeline[0]?.scoreTimestamp ?? 0;

  return scoreTimeline.map((entry) => {
    return scoreTimestampToPlaybackSeconds(
      entry.scoreTimestamp,
      timing,
      firstTimestamp,
    );
  });
}

function wholeNotesToSeconds(wholeNotes, bpm) {
  return wholeNotes * QUARTER_NOTES_PER_WHOLE_NOTE * (60 / bpm);
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
