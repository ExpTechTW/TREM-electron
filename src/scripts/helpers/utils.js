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

const checkOverlap = (x, y, className, id) => {
  let el = document.elementFromPoint(x, y);

  if (!el) return false;

  if (el.className.includes("cross-label-"))
    el = el.parentElement;

  if (el.className.includes("cross-label-"))
    el = el.parentElement;

  if (el.classList.contains(className)) {
    if (el.id == id)
      return false;

    return true;
  } else {
    return false;
  }
};

module.exports = { getMagnitudeLevel, getDepthLevel, checkOverlap };