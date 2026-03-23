const { AppError } = require("../errors/AppError");

function asyncRoute(routeHandler) {
  return (request, response, next) => {
    Promise.resolve()
      .then(() => routeHandler(request, response, next))
      .catch(next);
  };
}

function errorHandler(error, _request, response, _next) {
  const isAppError = error instanceof AppError;
  const responseStatus = isAppError ? error.status : 500;
  const responseMessage = error?.message || "서버 오류가 발생했습니다.";
  const responseCode = isAppError ? error.code : "INTERNAL_ERROR";
  const responseDetails = isAppError ? error.details : null;

  response.status(responseStatus).json({
    error: responseMessage,
    code: responseCode,
    details: responseDetails,
  });
}

module.exports = { asyncRoute, errorHandler };
