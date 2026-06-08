export function getMusicDataUrl(path) {
  if (!path) {
    return "";
  }

  return `/MusicData/${path.replace(/^\.\//, "")}`;
}
