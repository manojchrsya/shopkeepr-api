module.exports = () => {
  const regex = /contentType "\w+\/\w+" is not allowed \(Must be in \[(\w+|\/|, )+\]\)/gmi;
  return (error, req, res, next) => {
    if (regex.test(error.message)) {
      error = new BadRequestError(error.message);
    }
    next(error);
  };
};
