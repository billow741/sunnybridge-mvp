import 'package:dio/dio.dart';

import 'test_data.dart';

/// Dio interceptor that intercepts all HTTP requests and returns
/// pre-defined teacher-app mock responses for integration tests.
class MockDioInterceptor extends Interceptor {
  /// Whether to return empty list for /courses/today (for empty-state test).
  bool todayEmpty = false;

  @override
  void onRequest(
      RequestOptions options, RequestInterceptorHandler handler) {
    final path = options.path;
    final method = options.method;

    // ── GET /courses/today ──
    if (path.contains('/courses/today')) {
      handler.resolve(Response(
        requestOptions: options,
        data: todayEmpty ? TestData.emptyTodayCoursesJson : TestData.todayCoursesJson,
        statusCode: 200,
      ));
      return;
    }

    // ── GET /courses/all ──
    if (path.contains('/courses/all')) {
      handler.resolve(Response(
        requestOptions: options,
        data: TestData.allCoursesJson,
        statusCode: 200,
      ));
      return;
    }

    // ── POST /courses/{id}/feedback ──
    if (method == 'POST' && path.contains('/feedback')) {
      handler.resolve(Response(
        requestOptions: options,
        data: TestData.feedbackSubmitResponseJson,
        statusCode: 200,
      ));
      return;
    }

    // ── PUT /courses/{id}/feedback ──
    if (method == 'PUT' && path.contains('/feedback')) {
      handler.resolve(Response(
        requestOptions: options,
        data: TestData.feedbackSubmitResponseJson,
        statusCode: 200,
      ));
      return;
    }

    // ── GET /courses/{id} (detail) ──
    if (path.contains('/courses/') &&
        !path.contains('/courses/today') &&
        !path.contains('/courses/all') &&
        !path.contains('/feedback')) {
      final segments = path.split('/');
      final courseId = segments.last;
      handler.resolve(Response(
        requestOptions: options,
        data: TestData.courseDetailJson(courseId),
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
