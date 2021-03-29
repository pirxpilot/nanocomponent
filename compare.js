module.exports = compare

// included for compatibility reasons only
// implements a simple shallow compare for simple values in arrays

function compare (array1, array2) {
  const length = array1.length
  if (length !== array2.length) return true

  for (let i = 0; i < length; i++) {
    if (array1[i] !== array2[i]) return true
  }
  return false
}
