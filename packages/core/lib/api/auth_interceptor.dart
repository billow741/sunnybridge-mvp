import 'package:dio/dio.dart';
import '../auth/auth_storage_base.dart';

/// Dio interceptor that injects JWT Authorization header and handles 401.
///
/// Flow:
/// 1. On every request, reads access_token from AuthStorage
///    and adds `Authorization: Bearer <token>` header.
/// 2. On 401 response, attempts token refresh once.
///    - If refresh succeeds → retry original request with new token.
///    - If refresh fails → clear tokens and emit AuthFailure event.
class AuthInterceptor extends Interceptor {
  final AuthStorageBase _authStorage;
  final Dio _dio;

  /// Callback when auth fails (token expired + refresh failed).
  /// The app should navigate to login page.
  final void Function()? onAuthFailure;

  AuthInterceptor({
    required AuthStorageBase authStorage,
    required Dio dio,
    this.onAuthFailure,
  })  : _authStorage = authStorage,
        _dio = dio;

  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _authStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try refresh once
      final refreshed = await _tryRefreshToken();
      if (refreshed) {
        // Retry original request with new token
        final newToken = await _authStorage.getAccessToken();
        if (newToken != null) {
          err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
          try {
            final response = await _dio.fetch(err.requestOptions);
            handler.resolve(response);
            return;
          } on DioException catch (e) {
            handler.reject(e);
            return;
          }
        }
      }
      // Refresh failed — logout
      await _authStorage.clearAll();
      onAuthFailure?.call();
    }
    handler.next(err);
  }

  Future<bool> _tryRefreshToken() async {
    final refreshToken = await _authStorage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final response = await _dio.post(
        '/auth/refresh',
        data: {'refresh_token': refreshToken},
        options: Options(headers: {'Authorization': ''}), // no auth header
      );
      if (response.statusCode == 200) {
        final data = response.data;
        await _authStorage.saveTokens(
          accessToken: data['access_token'] as String,
          refreshToken: data['refresh_token'] as String?,
        );
        return true;
      }
    } catch (_) {
      // Refresh failed — will be handled by caller
    }
    return false;
  }
}
