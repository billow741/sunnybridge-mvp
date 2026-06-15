import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';
import 'app.dart';

/// Global navigator key for auth-failure redirect from outside widget tree.
final rootNavigatorKey = GlobalKey<NavigatorState>();

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize API client — base URL will be configured per environment
  final apiClient = ApiClient(
    baseUrl: const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:8000/api/v1', // Android emulator → host
    ),
    onAuthFailure: () {
      // When token expired + refresh failed, redirect to login page.
      // Uses GoRouter via the shared navigatorKey.
      final context = rootNavigatorKey.currentContext;
      if (context != null) {
        GoRouter.of(context).go(RoutePaths.login);
      }
    },
  );

  runApp(SunnyBridgeApp(apiClient: apiClient, navigatorKey: rootNavigatorKey));
}
