import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'auth_storage_base.dart';

/// Secure JWT token storage using flutter_secure_storage.
///
/// Stores access_token, refresh_token, auth_role, and must_change_password
/// in platform-specific encrypted storage
/// (Keychain on iOS, EncryptedSharedPreferences on Android).
class AuthStorage implements AuthStorageBase {
  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyAuthRole = 'auth_role';
  static const _keyMustChangePassword = 'must_change_password';

  final FlutterSecureStorage _storage;

  AuthStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  // ── Token ──────────────────────────────────────

  /// Read access token. Returns null if not stored.
  Future<String?> getAccessToken() =>
      _storage.read(key: _keyAccessToken);

  /// Read refresh token. Returns null if not stored.
  Future<String?> getRefreshToken() =>
      _storage.read(key: _keyRefreshToken);

  /// Save both tokens (e.g. after login).
  Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _keyRefreshToken, value: refreshToken);
    }
  }

  // ── Role ───────────────────────────────────────

  /// Read stored auth role (e.g. 'teacher', 'parent').
  Future<String?> getAuthRole() =>
      _storage.read(key: _keyAuthRole);

  /// Save auth role after login.
  Future<void> saveAuthRole(String role) =>
      _storage.write(key: _keyAuthRole, value: role);

  // ── Must Change Password ───────────────────────

  /// Read must_change_password flag. Returns null if not stored.
  Future<bool?> getMustChangePassword() async {
    final value = await _storage.read(key: _keyMustChangePassword);
    if (value == null) return null;
    return value == 'true';
  }

  /// Save must_change_password flag.
  Future<void> saveMustChangePassword(bool value) =>
      _storage.write(key: _keyMustChangePassword, value: value.toString());

  // ── Save all login data ────────────────────────

  /// Convenience: save all auth data from a login response.
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

  // ── Clear ──────────────────────────────────────

  /// Clear all tokens and auth state (logout).
  Future<void> clearAll() async {
    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);
    await _storage.delete(key: _keyAuthRole);
    await _storage.delete(key: _keyMustChangePassword);
  }

  /// @deprecated Use clearAll() instead. Clear tokens only (legacy).
  Future<void> clearTokens() async {
    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);
  }

  /// Check if user is logged in (has an access token).
  Future<bool> isLoggedIn() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
