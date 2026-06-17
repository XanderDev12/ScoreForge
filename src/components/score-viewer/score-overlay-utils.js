export function removeSvgOverlay(container, className) {
  container
    ?.querySelectorAll(`.${className}`)
    .forEach((overlayGroup) => overlayGroup.remove());
}

export function safeGetBBox(element) {
  try {
    return element.getBBox();
  } catch {
    return null;
  }
}

export function createSvgElement(tagName) {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}
