module.exports = function pad(number, width) {
  const stringNumber = String(number);
  return stringNumber.length >= width
    ? stringNumber
    : new Array(width - stringNumber.length + 1).join("0") + stringNumber;
};
