import 'package:flutter/material.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

import 'pages/profile_page.dart';
import 'pages/library_page.dart';
import 'pages/library_reader_page.dart';
import 'pages/resource_page.dart';
import 'pages/resource_preview_page.dart';

/// Root widget for SunnyBridge Student App.
///
/// Wires together:
/// - AppTheme (light theme)
/// - GoRouter (navigation with auth guard)
/// - ApiClient (HTTP + JWT)
class SunnyBridgeApp extends StatelessWidget {
  final ApiClient apiClient;
  final GlobalKey<NavigatorState> navigatorKey;

  const SunnyBridgeApp({
    super.key,
    required this.apiClient,
    required this.navigatorKey,
  });

  @override
  Widget build(BuildContext context) {
    final router = createAppRouter(
      apiClient: apiClient,
      navigatorKey: navigatorKey,
      initialLocation: RoutePaths.login,
      redirect: (context, state) async {
        final currentPath = state.matchedLocation;
        final isLoggedIn = await apiClient.authStorage.isLoggedIn();
        final isLoginRoute = currentPath == RoutePaths.login;

        // Not logged in → must go to login
        if (!isLoggedIn && !isLoginRoute) {
          return RoutePaths.login;
        }

        // Logged in + on login page → redirect to course
        if (isLoggedIn && isLoginRoute) {
          return RoutePaths.course;
        }

        // All good, no redirect
        return null;
      },
      profilePageBuilder: (context, state) => ProfilePage(apiClient: apiClient),
      libraryPageBuilder: (context, state) => LibraryPage(apiClient: apiClient),
      libraryReaderPageBuilder: (context, state) {
        final materialId = state.pathParameters['id']!;
        return LibraryReaderPage(
          apiClient: apiClient,
          materialId: materialId,
        );
      },
      resourcePageBuilder: (context, state) => ResourcePage(apiClient: apiClient),
      resourcePreviewPageBuilder: (context, state) {
        final resourceId = state.pathParameters['id']!;
        final extra = state.extra as Map<String, dynamic>?;
        return ResourcePreviewPage(
          apiClient: apiClient,
          resourceId: resourceId,
          title: extra?['title'] as String?,
        );
      },
    );

    return MaterialApp.router(
      title: 'SunnyBridge',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}