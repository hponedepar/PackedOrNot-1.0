// Wraps an async route handler so any rejected promise (e.g. a database
// error) is forwarded to the central errorHandler via next(err), instead
// of becoming an unhandled rejection. Keeps the controllers clean.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
