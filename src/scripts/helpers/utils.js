const getMagnitudeLevel = (magnitude) =>
  [1.99, 3.99, 4.99, 5.99, 6.99, 7.99]
    .concat(magnitude)
    .sort((a, b) => a - b)
    .indexOf(magnitude);

const getDepthLevel = (depth) =>
  [30, 70, 300]
    .concat(depth)
    .sort((a, b) => a - b)
    .indexOf(depth);

const checkOverlap = (x, y, h, w, className, id) => {
  const rects = [...document.querySelectorAll(`.${className}`)].map((v) => v.getBoundingClientRect());

  const p = [
    [x - w, y - h],
    [x + w, y - h],
    [x - w, y + h],
    [x + w, y + h],
  ];

  for (let i = 0; i < 4; i++) {
    let el = document.elementFromPoint(p[i][0], p[i][1]);

    if (!el) continue;

    if (el.className?.includes?.("cross-label-"))
      el = el.parentElement;

    if (el.className?.includes?.("cross-label-"))
      el = el.parentElement;

    if (el.classList.contains(className)) {
      if (el.id == id)
        return false;

      return true;
    } else {
      continue;
    }
  }

  return false;
};


/**
 *
 * @param {string} timeString
 * @example
 * toISOTimestamp("2023/08/10 12:34:21")
 * // 2023-08-10T12:34:21+08:00
 */
const toISOTimestamp = (timeString) => `${timeString.replace(/\//g, "-").split(" ").join("T")}+08:00`;

module.exports = { getMagnitudeLevel, getDepthLevel, checkOverlap, toISOTimestamp };