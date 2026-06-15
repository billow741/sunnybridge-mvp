import 'package:sunnybridge_core/sunnybridge_core.dart';

/// In-memory fake AuthStorageBase for teacher integration tests.
/// Pre-seeds teacher role so the auth guard in GoRouter
/// lets the app go directly to /courses.
class FakeAuthStorage implements AuthStorageBase {
  final Map<String, String> _store = {};

  FakeAuthStorage({bool preLoggedIn = true}) {
    if (preLoggedIn) {
      _store['access_token'] = 'fake_teacher_access_token';
      _store['refresh_token'] = 'fake_teacher_refresh_token';
      _store['auth_role'] = 'teacher';
      _store['must_change_password'] = 'false';
    }
  }

  @override
  Future<String?> getAccessToken() async => _store['access_token'];

  @override
  Future<String?> getRefreshToken() async => _store['refresh_token'];

  @override
  Future<void> saveTokens({required String accessToken, String? refreshToken}) async {
    _store['access_token'] = accessToken;
    if (refreshToken != null) {
      _store['refresh_token'] = refreshToken;
    }
  }

  @override
  Future<String?> getAuthRole() async => _store['auth_role'];

  @override
  Future<void> saveAuthRole(String role) async {
    _store['auth_role'] = role;
  }

  @override
  Future<bool?> getMustChangePassword() async {
    final value = _store['must_change_password'];
    if (value == null) return null;
    return value == 'true';
  }

  @override
  Future<void> saveMustChangePassword(bool value) async {
    _store['must_change_password'] = value.toString();
  }

  @override
  Future<void> saveLoginData({
    required String accessToken,
    String? refreshToken,
    required String role,
    required bool mustChangePassword,
  }) async {
    await saveTokens(accessToken: accessToken, refreshToken: refreshToken);
    await saveAuthRole(role);
    await saveMustChangePassword(mustChangePassword);
  }

  @override
  Future<void> clearAll() async {
    _store.clear();
  }

  @override
  Future<void> clearTokens() async {
    _store.remove('access_token');
    _store.remove('refresh_token');
  }

  @override
  Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
