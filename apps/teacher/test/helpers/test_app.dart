import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

import 'package:sunnybridge_teacher/pages/teacher_courses_page.dart';
import 'package:sunnybridge_teacher/pages/teacher_course_detail_page.dart';
import 'package:sunnybridge_teacher/pages/teacher_login_page.dart';
import 'package:sunnybridge_teacher/pages/teacher_change_password_page.dart';

import 'fake_auth_storage.dart';
import 'mock_dio_interceptor.dart';

export 'test_data.dart';

/// Shared fake auth storage — pre-logged-in teacher.
final fakeAuthStorage = FakeAuthStorage(preLoggedIn: true);

/// The mock interceptor — accessible from tests for verification.
final mockInterceptor = MockDioInterceptor();

/// Creates a pre-configured ApiClient for integration tests.
ApiClient createTestApiClient() {
  return ApiClient(
    baseUrl: 'http://localhost:9999/api/v1',
    authStorage: fakeAuthStorage,
    extraInterceptors: [mockInterceptor],
  );
}

/// Creates the teacher test app widget.
Widget createTestApp({
  String initialLocation = '/courses',
  GlobalKey<NavigatorState>? navigatorKey,
}) {
  final apiClient = createTestApiClient();
  final navKey = navigatorKey ?? GlobalKey<NavigatorState>();

  final router = GoRouter(
    navigatorKey: navKey,
    initialLocation: initialLocation,
    debugLogDiagnostics: true,
    redirect: (context, state) async {
      final currentPath = state.matchedLocation;
      final isLoggedIn = await apiClient.authStorage.isLoggedIn();
      final isLoginRoute = currentPath == '/login';
      final isChangePwRoute = currentPath == '/change-password';

      if (!isLoggedIn) {
        if (!isLoginRoute) return '/login';
        return null;
      }

      final role = await apiClient.authStorage.getAuthRole();
      if (role != 'teacher') {
        await apiClient.authStorage.clearAll();
        return '/login';
      }

      final mustChange = await apiClient.authStorage.getMustChangePassword();
      if (mustChange == true && !isChangePwRoute) {
        return '/change-password';
      }

      if (isLoginRoute) return '/courses';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) =>
            TeacherLoginPage(apiClient: apiClient),
      ),
      GoRoute(
        path: '/change-password',
        builder: (context, state) =>
            TeacherChangePasswordPage(apiClient: apiClient),
      ),
      GoRoute(
        path: '/courses',
        builder: (context, state) =>
            TeacherCoursesPage(apiClient: apiClient),
      ),
      GoRoute(
        path: '/course-detail/:courseId',
        builder: (context, state) {
          final courseId = state.pathParameters['courseId']!;
          return TeacherCourseDetailPage(
            apiClient: apiClient,
            courseId: courseId,
          );
        },
      ),
    ],
  );

  return MaterialApp.router(
    title: 'SunnyBridge Teacher Test',
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light,
    routerConfig: router,
  );
}
