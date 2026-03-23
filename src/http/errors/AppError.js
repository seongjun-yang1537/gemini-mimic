class AppError extends Error {
  constructor({ status = 500, message = "서버 오류가 발생했습니다.", code = "INTERNAL_ERROR", details = null } = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details, code = "BAD_REQUEST") {
    return new AppError({ status: 400, message, code, details });
  }

  static notFound(message, details, code = "NOT_FOUND") {
    return new AppError({ status: 404, message, code, details });
  }
}

module.exports = { AppError };
