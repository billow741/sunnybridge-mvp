import 'package:dio/dio.dart';

import 'test_data.dart';

/// Dio interceptor that intercepts all HTTP requests and returns
/// pre-defined mock responses for integration tests.
///
/// This ensures:
/// - Zero real network calls
/// - Deterministic test data
/// - No dependency on backend server
class MockDioInterceptor extends Interceptor {
  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) {
    final path = options.path;

    // ── GET /api/v1/courses/today ──
    if (path.contains('/courses/today')) {
      handler.resolve(Response(
        requestOptions: options,
        data: TestData.todayCoursesJson,
        statusCode: 200,
      ));
      return;
    }

    // ── GET /api/v1/courses/history ──
    if (path.contains('/courses/history')) {
      handler.resolve(Response(
        requestOptions: options,
        data: TestData.historyCoursesJson,
        statusCode: 200,
      ));
      return;
    }

    // ── GET /api/v1/courses/{id} ──
    // Match paths like "/api/v1/courses/c-pending-001"
    // but NOT /courses/today or /courses/history
    if (path.contains('/courses/') &&
        !path.contains('/courses/today') &&
        !path.contains('/courses/history')) {
      final segments = path.split('/');
      final courseId = segments.last;
      handler.resolve(Response(
        requestOptions: options,
        data: TestData.courseDetailJson(courseId),
        statusCode: 200,
      ));
      return;
    }

    // ── GET /children/me (resolved via Dio baseUrl) ──
    if (path.contains('/children/me')) {
      handler.resolve(Response(
        requestOptions: options,
        data: TestData.childProfileJson,
        statusCode: 200,
      ));
      return;
    }

    // ── Default: 404 ──
    handler.reject(DioException(
      requestOptions: options,
      response: Response(
        requestOptions: options,
        data: {'detail': 'Not found in mock'},
        statusCode: 404,
      ),
    ));
  }
}
