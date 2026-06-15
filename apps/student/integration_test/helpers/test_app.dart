import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

import 'package:sunnybridge_student/pages/profile_page.dart';

import 'fake_auth_storage.dart';
import 'mock_dio_interceptor.dart';

/// Re-export test data for convenience.
export 'test_data.dart';

/// Shared fake auth storage — accessible from tests for verification.
final fakeAuthStorage = FakeAuthStorage(preLoggedIn: true);

/// The mock interceptor — accessible from tests for verification.
final mockInterceptor = MockDioInterceptor();

/// Creates a pre-configured ApiClient for integration tests.
///
/// - Uses FakeAuthStorage (pre-logged-in parent)
/// - Adds MockDioInterceptor to intercept all HTTP requests
/// - No real network calls are made
ApiClient createTestApiClient() {
  return ApiClient(
    baseUrl: 'http://localhost:9999/api/v1', // irrelevant, all intercepted
    authStorage: fakeAuthStorage,
    extraInterceptors: [mockInterceptor],
  );
}

/// Creates the test app widget — mirrors SunnyBridgeApp but with mock data.
///
/// [initialLocation] defaults to '/course' to skip login.
Widget createTestApp({
  String initialLocation = '/course',
  GlobalKey<NavigatorState>? navigatorKey,
}) {
  final apiClient = createTestApiClient();
  final navKey = navigatorKey ?? GlobalKey<NavigatorState>();

  final router = createAppRouter(
    apiClient: apiClient,
    navigatorKey: navKey,
    initialLocation: initialLocation,
    redirect: (context, state) async {
      final isLoggedIn = await apiClient.authStorage.isLoggedIn();
      final currentPath = state.matchedLocation;
      final isLoginRoute = currentPath == RoutePaths.login;

      if (!isLoggedIn && !isLoginRoute) {
        return RoutePaths.login;
      }
      if (isLoggedIn && isLoginRoute) {
        return RoutePaths.course;
      }
      return null;
    },
    // Use the real ProfilePage (from student app, not core's PlaceholderPage)
    profilePageBuilder: (context, state) =>
        ProfilePage(apiClient: apiClient),
  );

  return MaterialApp.router(
    title: 'SunnyBridge Test',
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light,
    routerConfig: router,
  );
}

/// Sets up a test handler to intercept url_launcher MethodChannel calls.
///
/// In Flutter 3.x, use TestDefaultBinaryMessengerBinding.overrideMethodChannel
/// which is the replacement for the deprecated setMockMethodCallHandler.
///
/// Returns a cleanup function to restore the original handler.
void Function() setupUrlLauncherMock() {
  const channel = MethodChannel('plugins.flutter.io/url_launcher');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(channel, (call) async {
    if (call.method == 'launchUrl' || call.method == 'canLaunchUrl') {
      final url = call.arguments is Map
          ? call.arguments['url'] as String? ??
              call.arguments['url']?.toString()
          : call.arguments?.toString();
      if (call.method == 'launchUrl') {
        fakeAuthStorage.urlLaunchCalled = true;
        fakeAuthStorage.lastLaunchedUrl = url;
      }
      return true;
    }
    return false;
  });

  return () {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  };
}
