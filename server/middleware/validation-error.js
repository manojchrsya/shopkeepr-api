module.exports = () => (error, req, res, next) => {
  if (error.statusCode === 422 && !error.code) {
    error.code = 'VALIDATION_ERROR';
  }
  next(error);
};
