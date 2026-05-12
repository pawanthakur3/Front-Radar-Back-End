function notFound(req, res, next) {
  const err = new Error(`Not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

function errorHandler(err, req, res, next) {
  const status  = err.status || 500;
  const message = err.message || 'Internal server error';
  if (status >= 500) console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  res.status(status).json({
    success: false,
    error: { message, ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }) },
  });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { notFound, errorHandler, asyncHandler };
