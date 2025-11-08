/**
 * Find exact image by its original path
 * @param {string} originalPath - The original path to search for
 * @returns {string|null} - The matched file path or null if not found
 */
function exactImageByPath(originalPath) {
  const config = window.emojiConfig;

  for (const groupKey of Object.keys(config)) {
    for (const group of config[groupKey]) {
      for (const file of group.files) {
        if (file.originalPath === originalPath) {
          return file.path;
        }
      }
    }
  }

  return null;
}

/**
 * Get random image by directory path
 * @param {string} dirPath - The directory path to search in
 * @returns {string|null} - A random file path from the directory or null if no matches
 */
function randomImageByPath(dirPath) {
  const config = window.emojiConfig;
  const matches = [];

  for (const groupKey of Object.keys(config)) {
    for (const group of config[groupKey]) {
      for (const file of group.files) {
        // match directory (start of path)
        if (file.path.startsWith(dirPath.replace(/\\/g, "/") + "/")) {
          matches.push(file.path);
        }
      }
    }
  }

  if (matches.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * matches.length);
  return matches[randomIndex];
}

function updateEmojiInProgressBar(path) {
  var randomEmojiPath = randomImageByPath(path);
  var fullPath = `./emoji/${randomEmojiPath}`;
  var emojiContainer = document.getElementById("emoji");
  const prefetch = new Image();
  prefetch.src = fullPath;
  prefetch.alt = "emoji";
  setTimeout(() => {
    emojiContainer.classList.add("zoomIn");
    setTimeout(() => {
        emojiContainer.innerHTML = ``;
        emojiContainer.appendChild(prefetch);
        emojiContainer.classList.add("zoomOut");
      setTimeout(() => {
        emojiContainer.classList.remove("zoomIn");
        emojiContainer.classList.remove("zoomOut");
      }, 200);
    }, 200);
  }, 200);
}

window.exactImageByPath = exactImageByPath;
window.randomImageByPath = randomImageByPath;
window.updateEmojiInProgressBar = updateEmojiInProgressBar;
