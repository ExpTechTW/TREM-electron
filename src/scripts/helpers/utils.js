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

module.exports = { getMagnitudeLevel, getDepthLevel };