import { useEffect } from "react";
import { createSvgElement, removeSvgOverlay, safeGetBBox } from "./score-overlay-utils.js";

const OVERLAY_CLASS = "note-letter-overlay";
const LETTER_LINE_HEIGHT = 12;
const NOTE_LABEL_GAP = 8;

export function NoteLetterOverlay({ container, enabled, osmd }) {
  useEffect(() => {
    removeSvgOverlay(container, OVERLAY_CLASS);

    if (!enabled || !container || !osmd) {
      return;
    }

    const cleanup = renderNoteLetters(osmd, container);

    return () => {
      cleanup();
    };
  }, [container, enabled, osmd]);

  return null;
}

function renderNoteLetters(osmd, container) {
  const pages = getRenderedPages(osmd, container);
  const noteGroups = collectPlayableNoteGroups(osmd);

  for (const noteGroup of noteGroups) {
    addNoteGroupLabel(noteGroup, pages);
  }

  return () => removeSvgOverlay(container, OVERLAY_CLASS);
}

function addNoteGroupLabel(noteGroup, pages) {
  const page = pages[noteGroup.pageIndex] ?? pages[0];

  if (!page) {
    return;
  }

  const positionedNotes = noteGroup.notes
    .map((note) => {
      const x = page.toSvgX(note.x);
      const y = page.toSvgY(note.y);

      return {
        ...note,
        x,
        y,
      };
    })
    .filter((note) => {
      return Number.isFinite(note.x) && Number.isFinite(note.y) && note.label;
    });

  if (positionedNotes.length === 0) {
    return;
  }

  const highestNote = positionedNotes.reduce((highest, current) => {
    return current.y < highest.y ? current : highest;
  });
  const averageX =
    positionedNotes.reduce((total, note) => total + note.x, 0) / positionedNotes.length;
  const staffTopY = getStaffTopYForNoteGroup(positionedNotes, page);
  const bottomLabelY = staffTopY ? staffTopY - NOTE_LABEL_GAP : highestNote.y - NOTE_LABEL_GAP;
  const labels = positionedNotes
    .sort((firstNote, secondNote) => firstNote.y - secondNote.y)
    .map(({ label }) => label);

  labels.forEach((label, labelIndex) => {
    const text = createSvgElement("text");
    const y = bottomLabelY - (labels.length - labelIndex - 1) * LETTER_LINE_HEIGHT;

    text.setAttribute("x", String(averageX));
    text.setAttribute("y", String(Math.max(y, 10)));
    text.textContent = label;
    page.overlay.append(text);
  });
}

function getRenderedPages(osmd, container) {
  const musicPages = osmd.GraphicSheet?.MusicPages ?? [];

  return Array.from(container.querySelectorAll("svg")).map((svg, pageIndex) => {
    const overlay = createSvgElement("g");
    overlay.classList.add(OVERLAY_CLASS);
    svg.append(overlay);
    const viewBox = getSvgViewBox(svg);
    const pagePosition = getPosition(musicPages[pageIndex]);
    const pageSize = getSize(musicPages[pageIndex]);
    const scaleX = pageSize.width ? viewBox.width / pageSize.width : 10;
    const scaleY = pageSize.height ? viewBox.height / pageSize.height : scaleX;

    return {
      overlay,
      staffGroups: getStaffGroups(svg),
      svg,
      toSvgX: (x) => (x - pagePosition.x) * scaleX + viewBox.x,
      toSvgY: (y) => (y - pagePosition.y) * scaleY + viewBox.y,
    };
  });
}

function getStaffTopYForNoteGroup(positionedNotes, page) {
  const averageX = positionedNotes.reduce((total, note) => total + note.x, 0) / positionedNotes.length;
  const averageY = positionedNotes.reduce((total, note) => total + note.y, 0) / positionedNotes.length;
  const nearbyStaff = page.staffGroups
    .filter((staffGroup) => {
      return (
        averageX >= staffGroup.leftX - 8 &&
        averageX <= staffGroup.rightX + 8 &&
        averageY >= staffGroup.topY - staffGroup.spacing * 6 &&
        averageY <= staffGroup.bottomY + staffGroup.spacing * 6
      );
    })
    .sort((firstStaff, secondStaff) => {
      const firstDistance = Math.abs(averageY - (firstStaff.topY + firstStaff.bottomY) / 2);
      const secondDistance = Math.abs(averageY - (secondStaff.topY + secondStaff.bottomY) / 2);

      return firstDistance - secondDistance;
    });

  return nearbyStaff[0]?.topY ?? null;
}

function getStaffGroups(svg) {
  const staffLines = Array.from(svg.querySelectorAll("path, line"))
    .map((element) => safeGetBBox(element))
    .filter((box) => {
      return box && box.width > 80 && box.height <= 2;
    })
    .sort((firstLine, secondLine) => firstLine.y - secondLine.y);
  const staffGroups = [];

  for (let index = 0; index <= staffLines.length - 5; index += 1) {
    const candidate = staffLines.slice(index, index + 5);
    const yGaps = candidate
      .slice(1)
      .map((lineBox, lineIndex) => lineBox.y - candidate[lineIndex].y);
    const averageGap = yGaps.reduce((total, gap) => total + gap, 0) / yGaps.length;
    const sharedLeft = Math.max(...candidate.map((lineBox) => lineBox.x));
    const sharedRight = Math.min(...candidate.map((lineBox) => lineBox.x + lineBox.width));
    const hasStaffSpacing = averageGap >= 4 && averageGap <= 18;
    const hasEvenSpacing = yGaps.every((gap) => Math.abs(gap - averageGap) <= 2);
    const hasSharedSpan = sharedRight - sharedLeft > 60;

    if (!hasStaffSpacing || !hasEvenSpacing || !hasSharedSpan) {
      continue;
    }

    const alreadyCaptured = staffGroups.some((staffGroup) => {
      return Math.abs(staffGroup.topY - candidate[0].y) < 2 && Math.abs(staffGroup.leftX - sharedLeft) < 4;
    });

    if (alreadyCaptured) {
      continue;
    }

    staffGroups.push({
      bottomY: candidate[4].y,
      leftX: sharedLeft,
      rightX: sharedRight,
      spacing: averageGap,
      topY: candidate[0].y,
    });
  }

  return staffGroups;
}

function collectPlayableNoteGroups(osmd) {
  const groups = [];
  const measureList = osmd.GraphicSheet?.MeasureList ?? [];

  for (const measureColumn of measureList) {
    for (const measure of measureColumn ?? []) {
      for (const staffEntry of measure?.staffEntries ?? []) {
        for (const voiceEntry of staffEntry?.graphicalVoiceEntries ?? []) {
          const notes = [];

          for (const note of voiceEntry?.notes ?? []) {
            if (!isPlayableGraphicalNote(note)) {
              continue;
            }

            const label = getSourceNoteLabel(note);
            const position = getPosition(note);

            if (label && position) {
              notes.push({
                label,
                pageIndex: getNotePageIndex(note),
                x: position.x,
                y: position.y,
              });
            }
          }

          if (notes.length > 0) {
            groups.push({
              notes,
              pageIndex: notes[0].pageIndex,
            });
          }
        }
      }
    }
  }

  return groups;
}

function isPlayableGraphicalNote(graphicalNote) {
  const sourceNote = graphicalNote?.sourceNote;

  if (!sourceNote?.Pitch) {
    return false;
  }

  if (sourceNote.isRest === true || sourceNote.IsRest === true) {
    return false;
  }

  if (typeof sourceNote.isRest === "function" && sourceNote.isRest()) {
    return false;
  }

  if (typeof sourceNote.IsRest === "function" && sourceNote.IsRest()) {
    return false;
  }

  return true;
}

function getSourceNoteLabel(graphicalNote) {
  const pitch = graphicalNote.sourceNote?.Pitch;
  const pitchLabel = pitch?.ToStringShort?.() ?? pitch?.ToString?.() ?? "";

  return normalizePitchLabel(pitchLabel);
}

function getNotePageIndex(graphicalNote) {
  const parentPage = graphicalNote.ParentMusicPage ?? graphicalNote.parentMusicPage;
  const pageNumber = readNumber(parentPage?.pageNumber ?? parentPage?.PageNumber);

  if (Number.isFinite(pageNumber)) {
    return Math.max(0, pageNumber - 1);
  }

  return 0;
}

function getPosition(graphicalObject) {
  const position =
    graphicalObject?.PositionAndShape?.AbsolutePosition ??
    graphicalObject?.positionAndShape?.absolutePosition ??
    graphicalObject?.AbsolutePosition ??
    graphicalObject?.absolutePosition;
  const x = readNumber(position?.x ?? position?.X);
  const y = readNumber(position?.y ?? position?.Y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x, y };
}

function getSize(graphicalObject) {
  const size =
    graphicalObject?.PositionAndShape?.Size ??
    graphicalObject?.positionAndShape?.size ??
    graphicalObject?.Size ??
    graphicalObject?.size;
  const width = readNumber(size?.width ?? size?.Width);
  const height = readNumber(size?.height ?? size?.Height);

  return {
    height: Number.isFinite(height) ? height : 0,
    width: Number.isFinite(width) ? width : 0,
  };
}

function getSvgViewBox(svg) {
  const viewBox = svg.viewBox?.baseVal;

  if (viewBox?.width && viewBox?.height) {
    return {
      height: viewBox.height,
      width: viewBox.width,
      x: viewBox.x,
      y: viewBox.y,
    };
  }

  return {
    height: readNumber(svg.getAttribute("height")) || 0,
    width: readNumber(svg.getAttribute("width")) || 0,
    x: 0,
    y: 0,
  };
}

function readNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseFloat(value);
  }

  return Number.NaN;
}

function normalizePitchLabel(label) {
  return label
    .replace(/\d/g, "")
    .replace(/\u266f/g, "#")
    .replace(/\u266d/g, "b")
    .replace(/\ud834\udd2a/g, "##")
    .replace(/\ud834\udd2b/g, "bb")
    .trim();
}
