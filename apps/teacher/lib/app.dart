import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

import 'pages/teacher_change_password_page.dart';
import 'pages/teacher_course_detail_page.dart';
import 'pages/teacher_courses_page.dart';
import 'pages/teacher_login_page.dart';

/// Teacher app route names — matches IA.md page IDs.
class TeacherRouteNames {
  static const login = 'teacher-login';
  static const changePassword = 'teacher-change-password';
  static const courses = 'teacher-courses'; // T-TODAY + T-ALL
  static const courseDetail = 'teacher-course-detail'; // Detail + feedback
}

/// Teacher app route paths.
class TeacherRoutePaths {
  static const login = '/login';
  static const changePassword = '/change-password';
  static const courses = '/courses';
  static const courseDetail = '/course-detail/:courseId';
}

/// Root widget for SunnyBridge Teacher App.

/// Root widget for SunnyBridge Teacher App.
///
/// Wires together:
/// - AppTheme (light theme)
/// - GoRouter (navigation with auth guard)
/// - ApiClient (HTTP + JWT)
class TeacherApp extends StatelessWidget {
  final ApiClient apiClient;
  final GlobalKey<NavigatorState> navigatorKey;

  const TeacherApp({
    super.key,
    required this.apiClient,
    required this.navigatorKey,
  });

  @override
  Widget build(BuildContext context) {
    final router = GoRouter(
      navigatorKey: navigatorKey,
      initialLocation: TeacherRoutePaths.login,
      debugLogDiagnostics: true,
      redirect: (context, state) async {
        final currentPath = state.matchedLocation;
        final isLoggedIn = await apiClient.authStorage.isLoggedIn();
        final isLoginRoute = currentPath == TeacherRoutePaths.login;
        final isChangePwRoute =
            currentPath == TeacherRoutePaths.changePassword;

        // Not logged in → only login page is allowed
        if (!isLoggedIn) {
          // Unauthenticated user on any non-login route → force login
          if (!isLoginRoute) {
            return TeacherRoutePaths.login;
          }
          // On login page, no redirect needed
          return null;
        }

        // From here on, user IS logged in
        // Verify role
        final role = await apiClient.authStorage.getAuthRole();
        if (role != 'teacher') {
          // Non-teacher: clear and go login
          await apiClient.authStorage.clearAll();
          return TeacherRoutePaths.login;
        }

        // Check must_change_password
        final mustChange = await apiClient.authStorage.getMustChangePassword();
        if (mustChange == true && !isChangePwRoute) {
          return TeacherRoutePaths.changePassword;
        }

        // Logged in + on login page → redirect to courses
        if (isLoginRoute) {
          return TeacherRoutePaths.courses;
        }

        // All good, no redirect
        return null;
      },
      routes: [
        GoRoute(
          path: TeacherRoutePaths.login,
          name: TeacherRouteNames.login,
          builder: (context, state) => TeacherLoginPage(apiClient: apiClient),
        ),
        GoRoute(
          path: TeacherRoutePaths.changePassword,
          name: TeacherRouteNames.changePassword,
          builder: (context, state) =>
              TeacherChangePasswordPage(apiClient: apiClient),
        ),
        GoRoute(
          path: TeacherRoutePaths.courses,
          name: TeacherRouteNames.courses,
          builder: (context, state) => TeacherCoursesPage(apiClient: apiClient),
        ),
        GoRoute(
          path: TeacherRoutePaths.courseDetail,
          name: TeacherRouteNames.courseDetail,
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
      title: 'SunnyBridge 教师端',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
