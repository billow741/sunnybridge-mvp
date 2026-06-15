/// Abstract interface for auth storage operations.
///
/// Extracted from AuthStorage so that tests can provide a fake
/// implementation without depending on flutter_secure_storage.
///
/// Both AuthStorage (production) and FakeAuthStorage (tests) implement this.
abstract class AuthStorageBase {
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<void> saveTokens({required String accessToken, String? refreshToken});
  Future<String?> getAuthRole();
  Future<void> saveAuthRole(String role);
  Future<bool?> getMustChangePassword();
  Future<void> saveMustChangePassword(bool value);
  Future<void> saveLoginData({
    required String accessToken,
    String? refreshToken,
    required String role,
    required bool mustChangePassword,
  });
  Future<void> clearAll();
  Future<void> clearTokens();
  Future<bool> isLoggedIn();
}
