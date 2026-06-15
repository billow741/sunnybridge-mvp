import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

import '../app.dart';

/// Teacher change password page states.
enum TeacherChangePasswordState {
  idle,
  loading,
  success,
  oldPasswordWrong,
  validationError,
  networkError,
}

/// T-CHANGE-PASSWORD: Teacher change password page.
///
/// Fields:
/// - Current password (old_password)
/// - New password (≥8 chars, letters+digits)
/// - Confirm new password (must match new password)
///
/// On success → update must_change_password=false in AuthStorage → go /courses
/// Back button disabled when must_change_password=true (forced change).
class TeacherChangePasswordPage extends StatefulWidget {
  final ApiClient apiClient;

  const TeacherChangePasswordPage({super.key, required this.apiClient});

  @override
  State<TeacherChangePasswordPage> createState() =>
      _TeacherChangePasswordPageState();
}

class _TeacherChangePasswordPageState
    extends State<TeacherChangePasswordPage> {
  // ── Controllers ──────────────────────────────────
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _oldFocus = FocusNode();
  final _newFocus = FocusNode();
  final _confirmFocus = FocusNode();
  final _formKey = GlobalKey<FormState>();

  // ── State ────────────────────────────────────────
  TeacherChangePasswordState _state = TeacherChangePasswordState.idle;
  String? _errorMessage;
  bool _obscureOldPassword = true;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;
  bool _autoValidate = false;
  bool _mustChangePassword = true; // default: forced

  // ── Password complexity regex: ≥8 chars, at least one letter + one digit ─
  static final _passwordRegex = RegExp(r'^(?=.*[a-zA-Z])(?=.*\d).{8,}$');

  @override
  void initState() {
    super.initState();
    _loadMustChangePassword();
  }

  Future<void> _loadMustChangePassword() async {
    final value = await widget.apiClient.authStorage.getMustChangePassword();
    setState(() => _mustChangePassword = value ?? true);
  }

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _oldFocus.dispose();
    _newFocus.dispose();
    _confirmFocus.dispose();
    super.dispose();
  }

  bool get _canSubmit =>
      _oldPasswordController.text.isNotEmpty &&
      _newPasswordController.text.isNotEmpty &&
      _confirmPasswordController.text.isNotEmpty &&
      _state != TeacherChangePasswordState.loading;

  // ── Submit ───────────────────────────────────────
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      setState(() => _autoValidate = true);
      return;
    }

    setState(() {
      _state = TeacherChangePasswordState.loading;
      _errorMessage = null;
    });

    try {
      final response = await widget.apiClient.post(
        '/auth/teacher/change-password',
        data: {
          'old_password': _oldPasswordController.text,
          'new_password': _newPasswordController.text,
        },
      );

      if (!mounted) return;

      final data = response.data as Map<String, dynamic>;

      // Update local must_change_password flag
      final newMustChange = data['must_change_password'] as bool? ?? false;
      await widget.apiClient.authStorage.saveMustChangePassword(newMustChange);

      setState(() => _state = TeacherChangePasswordState.success);

      // Navigate to courses page
      if (mounted) {
        context.go(TeacherRoutePaths.courses);
      }
    } on DioException catch (e) {
      if (!mounted) return;
      _handleChangePasswordError(e);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _state = TeacherChangePasswordState.networkError;
        _errorMessage = '网络异常，请检查网络后重试';
      });
    }
  }

  void _handleChangePasswordError(DioException e) {
    final data = e.response?.data;
    final detail =
        data is Map<String, dynamic> ? data['detail'] ?? data : data;
    final detailMap =
        detail is Map<String, dynamic> ? detail : <String, dynamic>{};

    final message = detailMap['message'] as String? ?? '修改密码失败';

    switch (e.response?.statusCode) {
      case 401:
        // TEACHER_OLD_PASSWORD_WRONG
        setState(() {
          _state = TeacherChangePasswordState.oldPasswordWrong;
          _errorMessage = message; // "当前密码错误"
        });
        _oldPasswordController.clear();
        _oldFocus.requestFocus();
        break;
      case 422:
        // TEACHER_NEW_PASSWORD_TOO_SHORT / TEACHER_NEW_PASSWORD_WEAK
        setState(() {
          _state = TeacherChangePasswordState.validationError;
          _errorMessage = message;
        });
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        _newFocus.requestFocus();
        break;
      default:
        setState(() {
          _state = TeacherChangePasswordState.networkError;
          _errorMessage = message;
        });
    }
  }

  // ── Validators ───────────────────────────────────

  String? _validateNewPassword(String? value) {
    if (value == null || value.isEmpty) return '请输入新密码';
    if (value.length < 8) return '新密码至少8位';
    if (!_passwordRegex.hasMatch(value)) return '新密码需同时包含字母和数字';
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if (value == null || value.isEmpty) return '请确认新密码';
    if (value != _newPasswordController.text) return '两次输入的密码不一致';
    return null;
  }

  // ── Build ────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    // When must_change_password=true, prevent back navigation (forced change)
    return PopScope(
      canPop: !_mustChangePassword,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('修改密码'),
          automaticallyImplyLeading: !_mustChangePassword,
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppSpacing.xl),
                // Header message
                if (_mustChangePassword)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.warning.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline,
                            color: AppColors.warning, size: 20),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            '首次登录需修改密码后才能使用',
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.warning,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.lock_outline,
                            color: AppColors.primary, size: 20),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            '修改密码后将自动重新登录',
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: AppSpacing.xxl),
                _buildForm(),
                const SizedBox(height: 8),
                _buildErrorMessage(),
                const SizedBox(height: AppSpacing.xl),
                _buildSubmitButton(),
                const SizedBox(height: AppSpacing.xxxl),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      autovalidateMode: _autoValidate
          ? AutovalidateMode.onUserInteraction
          : AutovalidateMode.disabled,
      child: Column(
        children: [
          // Current password
          TextFormField(
            controller: _oldPasswordController,
            focusNode: _oldFocus,
            obscureText: _obscureOldPassword,
            enabled: _state != TeacherChangePasswordState.loading,
            textInputAction: TextInputAction.next,
            onFieldSubmitted: (_) => _newFocus.requestFocus(),
            decoration: InputDecoration(
              labelText: '当前密码',
              hintText: '请输入当前密码',
              prefixIcon:
                  const Icon(Icons.lock_outline, color: AppColors.textHint),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureOldPassword
                      ? Icons.visibility_off
                      : Icons.visibility,
                  color: AppColors.textHint,
                  size: AppSpacing.iconSm,
                ),
                onPressed: () =>
                    setState(() => _obscureOldPassword = !_obscureOldPassword),
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty) return '请输入当前密码';
              return null;
            },
          ),
          const SizedBox(height: AppSpacing.lg),
          // New password
          TextFormField(
            controller: _newPasswordController,
            focusNode: _newFocus,
            obscureText: _obscureNewPassword,
            enabled: _state != TeacherChangePasswordState.loading,
            textInputAction: TextInputAction.next,
            onFieldSubmitted: (_) => _confirmFocus.requestFocus(),
            decoration: InputDecoration(
              labelText: '新密码',
              hintText: '至少8位，包含字母和数字',
              prefixIcon:
                  const Icon(Icons.password, color: AppColors.textHint),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureNewPassword
                      ? Icons.visibility_off
                      : Icons.visibility,
                  color: AppColors.textHint,
                  size: AppSpacing.iconSm,
                ),
                onPressed: () =>
                    setState(() => _obscureNewPassword = !_obscureNewPassword),
              ),
            ),
            validator: _validateNewPassword,
          ),
          const SizedBox(height: AppSpacing.lg),
          // Confirm new password
          TextFormField(
            controller: _confirmPasswordController,
            focusNode: _confirmFocus,
            obscureText: _obscureConfirmPassword,
            enabled: _state != TeacherChangePasswordState.loading,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _canSubmit ? _submit() : null,
            decoration: InputDecoration(
              labelText: '确认新密码',
              hintText: '再次输入新密码',
              prefixIcon:
                  const Icon(Icons.check_circle_outline, color: AppColors.textHint),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureConfirmPassword
                      ? Icons.visibility_off
                      : Icons.visibility,
                  color: AppColors.textHint,
                  size: AppSpacing.iconSm,
                ),
                onPressed: () => setState(() =>
                    _obscureConfirmPassword = !_obscureConfirmPassword),
              ),
            ),
            validator: _validateConfirmPassword,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorMessage() {
    if (_errorMessage == null) return const SizedBox.shrink();

    final isError = _state == TeacherChangePasswordState.oldPasswordWrong ||
        _state == TeacherChangePasswordState.validationError ||
        _state == TeacherChangePasswordState.networkError;

    final icon = isError ? Icons.error_outline : Icons.info_outline;
    final color = isError ? AppColors.error : AppColors.warning;

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Text(
              _errorMessage!,
              style: AppTypography.bodySmall.copyWith(color: color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    final isLoading = _state == TeacherChangePasswordState.loading;

    return SizedBox(
      width: double.infinity,
      height: AppSpacing.buttonHeight,
      child: ElevatedButton(
        onPressed: _canSubmit ? _submit : null,
        style: ElevatedButton.styleFrom(
          backgroundColor:
              isLoading ? AppColors.primaryLight : AppColors.primary,
        ),
        child: isLoading
            ? const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.textWhite,
                    ),
                  ),
                  SizedBox(width: AppSpacing.sm),
                  Text('提交中...'),
                ],
              )
            : const Text('确认修改'),
      ),
    );
  }
}
