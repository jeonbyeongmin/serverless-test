module.exports = function getToday() {
  const today = new Date();
  const postingDate = `${today.getFullYear()}-${
    today.getMonth() >= 10 ? today.getMonth() : "0" + today.getMonth()
  }-${today.getDate() >= 10 ? today.getDate() : "0" + today.getDate()}`;

  return postingDate;
};
