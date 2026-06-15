import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../pages/course_detail_page.dart';
import '../pages/course_page.dart';
import '../pages/login_page.dart';

/// App route names — matches IA.md page IDs.
class RouteNames {
  static const login = 'login';
  static const course = 'course';
  static const courseDetail = 'course-detail';
  static const library = 'library';
  static const libraryReader = 'library-reader';
  static const resource = 'resource';
  static const resourcePreview = 'resource-preview';
  static const profile = 'profile';
}

/// App route paths.
class RoutePaths {
  static const login = '/login';
  static const course = '/course';
  static const courseDetail = '/course/:id';
  static const library = '/library';
  static const libraryReader = '/library/:id/read';
  static const resource = '/resource';
  static const resourcePreview = '/resource/:id/preview';
  static const profile = '/profile';
}

/// Placeholder page for routes not yet implemented.
/// Shows the route name and a "coming soon" message.
class PlaceholderPage extends StatelessWidget {
  final String title;
  final String? routeName;

  const PlaceholderPage({super.key, required this.title, this.routeName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.construction, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              '即将实现 · Coming Soon',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey,
                  ),
            ),
            if (routeName != null) ...[
              const SizedBox(height: 4),
              Text(
                'Route: $routeName',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[400],
                      fontFamily: 'monospace',
                    ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Creates the app GoRouter.
///
/// [initialLocation] defaults to login page.
/// [redirect] can be provided for auth guard logic.
/// All page builders are [GoRouterWidgetBuilder] — (BuildContext, GoRouterState) → Widget.
GoRouter createAppRouter({
  String initialLocation = RoutePaths.login,
  required ApiClient apiClient,
  GlobalKey<NavigatorState>? navigatorKey,
  FutureOr<String?> Function(BuildContext, GoRouterState)? redirect,
  List<GoRoute> extraRoutes = const [],
  GoRouterWidgetBuilder? profilePageBuilder,
  GoRouterWidgetBuilder? libraryPageBuilder,
  GoRouterWidgetBuilder? libraryReaderPageBuilder,
  GoRouterWidgetBuilder? resourcePageBuilder,
  GoRouterWidgetBuilder? resourcePreviewPageBuilder,
}) {
  final routes = <RouteBase>[
    GoRoute(
      path: RoutePaths.login,
      name: RouteNames.login,
      builder: (context, state) => LoginPage(apiClient: apiClient),
    ),
    GoRoute(
      path: RoutePaths.course,
      name: RouteNames.course,
      builder: (context, state) => CoursePage(apiClient: apiClient),
      routes: [
        GoRoute(
          path: ':id',
          name: RouteNames.courseDetail,
          builder: (context, state) => CourseDetailPage(
            courseId: state.pathParameters['id']!,
            apiClient: apiClient,
          ),
        ),
      ],
    ),
    GoRoute(
      path: RoutePaths.library,
      name: RouteNames.library,
      builder: libraryPageBuilder ??
          (context, state) => const PlaceholderPage(
                title: '阅读馆',
                routeName: RouteNames.library,
              ),
      routes: [
        GoRoute(
      path: ':id/read',
      name: RouteNames.libraryReader,
      builder: libraryReaderPageBuilder ??
          (context, state) => PlaceholderPage(
                title: 'PDF 阅读器',
                routeName: RouteNames.libraryReader,
              ),
    ),
      ],
    ),
    GoRoute(
      path: RoutePaths.resource,
      name: RouteNames.resource,
      builder: resourcePageBuilder ??
          (context, state) => const PlaceholderPage(
                title: '资源库',
                routeName: RouteNames.resource,
              ),
      routes: [
        GoRoute(
          path: ':id/preview',
          name: RouteNames.resourcePreview,
          builder: resourcePreviewPageBuilder ??
              (context, state) => PlaceholderPage(
                    title: '资源预览',
                    routeName: RouteNames.resourcePreview,
                  ),
        ),
      ],
    ),
    GoRoute(
      path: RoutePaths.profile,
      name: RouteNames.profile,
      builder: profilePageBuilder ??
          (context, state) => const PlaceholderPage(
                title: '我的',
                routeName: RouteNames.profile,
              ),
    ),
    ...extraRoutes,
  ];

  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: initialLocation,
    routes: routes,
    redirect: redirect,
    debugLogDiagnostics: true,
  );
}
