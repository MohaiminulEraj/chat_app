class AppException implements Exception {
  final String message;
  final int? statusCode;

  AppException({required this.message, this.statusCode});

  @override
  String toString() => 'AppException: $message (Code: $statusCode)';
}

class NetworkException extends AppException {
  NetworkException({required super.message, super.statusCode});
}

class ServerException extends AppException {
  ServerException({required super.message, required super.statusCode});
}

class CacheException extends AppException {
  CacheException({required super.message, super.statusCode});
}

class UnauthorizedException extends AppException {
  UnauthorizedException({required super.message}) : super(statusCode: 401);
}

class ForbiddenException extends AppException {
  ForbiddenException({required super.message}) : super(statusCode: 403);
}

class NotFoundException extends AppException {
  NotFoundException({required super.message}) : super(statusCode: 404);
}

class ValidationException extends AppException {
  ValidationException({required super.message}) : super(statusCode: 422);
}

class WebSocketException extends AppException {
  WebSocketException({required super.message, super.statusCode});
}
