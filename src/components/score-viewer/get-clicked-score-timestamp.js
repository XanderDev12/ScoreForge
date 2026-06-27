const OSMD_UNIT_IN_PIXELS = 10;
const SYSTEM_VERTICAL_TOLERANCE = 4;

export function getClickedScoreTimestamp({ container, event, osmd }) {
  const eventTarget = event.target;

  if (!(eventTarget instanceof Element)) {
    return null;
  }

  const pageElement = eventTarget.closest('[id^="osmdCanvasPage"]');
  const svg = eventTarget.closest("svg") ?? pageElement?.querySelector("svg");
  const screenTransform = svg?.getScreenCTM();

  if (!pageElement || !svg || !screenTransform) {
    return null;
  }

  const pageElements = [...container.querySelectorAll('[id^="osmdCanvasPage"]')];
  const pageIndex = pageElements.indexOf(pageElement);
  const graphicalPage = osmd.GraphicSheet?.MusicPages?.[pageIndex];

  if (!graphicalPage) {
    return null;
  }

  const svgPoint = svg.createSVGPoint();
  svgPoint.x = event.clientX;
  svgPoint.y = event.clientY;
  const localPoint = svgPoint.matrixTransform(screenTransform.inverse());
  const point = {
    x: localPoint.x / OSMD_UNIT_IN_PIXELS,
    y: localPoint.y / OSMD_UNIT_IN_PIXELS,
  };
  const system = findClickedSystem(graphicalPage.MusicSystems ?? [], point.y);

  if (!system) {
    return null;
  }

  const measures = system.StaffLines?.find((staffLine) => {
    return staffLine.ParentStaff?.isVisible?.() !== false;
  })?.Measures ?? [];
  const clickedMeasure = measures.find((measure) => {
    const bounds = getHorizontalBounds(measure?.PositionAndShape);
    return bounds && point.x >= bounds.start && point.x <= bounds.end;
  });
  const timestamp = clickedMeasure?.parentSourceMeasure?.AbsoluteTimestamp?.RealValue
    ?? system.GetSystemsFirstTimeStamp?.()?.RealValue;

  return Number.isFinite(timestamp) ? timestamp : null;
}

function findClickedSystem(systems, y) {
  return systems.find((system) => {
    const bounds = getVerticalBounds(system?.PositionAndShape);

    return (
      bounds
      && y >= bounds.start - SYSTEM_VERTICAL_TOLERANCE
      && y <= bounds.end + SYSTEM_VERTICAL_TOLERANCE
    );
  });
}

function getHorizontalBounds(box) {
  return getBounds(box, "x", "BorderLeft", "BorderRight", "width");
}

function getVerticalBounds(box) {
  return getBounds(box, "y", "BorderTop", "BorderBottom", "height");
}

function getBounds(box, axis, startKey, endKey, sizeKey) {
  const origin = Number(box?.AbsolutePosition?.[axis]);
  const startOffset = Number(box?.[startKey]);
  const endOffset = Number(box?.[endKey]);

  if (
    Number.isFinite(origin)
    && Number.isFinite(startOffset)
    && Number.isFinite(endOffset)
    && endOffset > startOffset
  ) {
    return { start: origin + startOffset, end: origin + endOffset };
  }

  const size = Number(box?.Size?.[sizeKey]);

  return Number.isFinite(origin) && Number.isFinite(size) && size > 0
    ? { start: origin, end: origin + size }
    : null;
}
