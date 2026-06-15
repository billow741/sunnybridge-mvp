import 'package:dio/dio.dart';
import '../auth/auth_storage.dart';
import '../auth/auth_storage_base.dart';
import 'auth_interceptor.dart';

/// Centralized HTTP client for SunnyBridge API.
///
/// Usage:
///   final api = ApiClient(baseUrl: 'https://api.example.com/api/v1');
///   final response = await api.get('/courses/today');
///
/// Features:
/// - JWT auto-injection via AuthInterceptor
/// - 401 auto-refresh with retry
/// - Configurable base URL, timeout, and headers
class ApiClient {
  late final Dio _dio;
  late final AuthStorageBase _authStorage;
  late final AuthInterceptor _authInterceptor;

  ApiClient({
    required String baseUrl,
    Duration connectTimeout = const Duration(seconds: 10),
    Duration receiveTimeout = const Duration(seconds: 30),
    AuthStorageBase? authStorage,
    void Function()? onAuthFailure,
    List<Interceptor>? extraInterceptors,
  }) {
    _authStorage = authStorage ?? AuthStorage();

    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: connectTimeout,
      receiveTimeout: receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _authInterceptor = AuthInterceptor(
      authStorage: _authStorage,
      dio: _dio,
      onAuthFailure: onAuthFailure,
    );

    _dio.interceptors.add(_authInterceptor);

    if (extraInterceptors != null) {
      _dio.interceptors.addAll(extraInterceptors);
    }
  }

  /// Expose the underlying Dio instance for advanced usage.
  Dio get dio => _dio;

  /// Expose auth storage for login/logout flows.
  AuthStorageBase get authStorage => _authStorage;

  // ── Convenience methods ──────────────────────────────

  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) =>
      _dio.get(path, queryParameters: queryParameters, options: options);

  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) =>
      _dio.post(path, data: data, queryParameters: queryParameters, options: options);

  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) =>
      _dio.put(path, data: data, queryParameters: queryParameters, options: options);

  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) =>
      _dio.delete(path, data: data, queryParameters: queryParameters, options: options);

  /// Upload multipart file (e.g. PDF).
  Future<Response> upload(
    String path, {
    required FormData formData,
    Options? options,
    void Function(int, int)? onSendProgress,
  }) =>
      _dio.post(
        path,
        data: formData,
        options: options,
        onSendProgress: onSendProgress,
      );
}
