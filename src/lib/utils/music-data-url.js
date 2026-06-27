export function getMusicDataUrl(path) {
  if (!path) {
    return "";
  }

  if (
    path.startsWith("blob:")
    || path.startsWith("https://")
    || path.startsWith("http://")
  ) {
    return path;
  }

  return `/MusicData/${path.replace(/^\.\//, "")}`;
}
