const { AppError } = require("../errors/AppError");

function validateRequest(validators = {}) {
  return (request, _response, next) => {
    const errorDetails = [];

    for (const [targetName, validator] of Object.entries(validators)) {
      if (typeof validator !== "function") {
        continue;
      }
      const targetValue = request[targetName];
      const validationResult = validator(targetValue, request);
      if (!validationResult) {
        continue;
      }
      if (Array.isArray(validationResult)) {
        errorDetails.push(...validationResult);
        continue;
      }
      errorDetails.push(validationResult);
    }

    if (errorDetails.length > 0) {
      next(AppError.badRequest("요청 검증에 실패했습니다.", errorDetails, "VALIDATION_ERROR"));
      return;
    }

    next();
  };
}

module.exports = { validateRequest };
