/**
 * Express error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Unhandled Error:', err.message, err.stack);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: messages,
    });
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Resource not found. Invalid field: ${err.path}`,
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const key = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `Duplicate field error: ${key} already exists.`,
    });
  }

  // Multer errors
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`,
    });
  }

  // Generic internal server error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = errorHandler;
