import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../auth/auth_storage.dart';
import '../router/app_router.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';

/// Login mode: SMS verification code or password.
enum LoginMode { sms, password }

/// Login page states (SMS flow).
enum SmsLoginState {
 idle,
 phoneInvalid,
 sending,
 codeSent,
 verifying,
 verifyFailed,
 rateLimited,
 locked,
 networkError,
}

/// Login page states (password flow).
enum PasswordLoginState {
 idle,
 loading,
 success,
 invalidCredentials,
 passwordNotSet,
 locked,
 networkError,
}

/// Student/Parent login page with two modes:
/// 1. SMS verification code (phone + code)
/// 2. Password login (phone + password) → POST /auth/parent/login
///
/// SMS flow: Phone input → Send code (60s cooldown) → Code input → Verify → Save JWT → Navigate.
/// Password flow: Phone + password → POST /auth/parent/login → Save JWT → Navigate.
class LoginPage extends StatefulWidget {
 final ApiClient apiClient;

 const LoginPage({super.key, required this.apiClient});

 @override
 State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
 // ── Shared ───────────────────────────────────────
 LoginMode _mode = LoginMode.sms;
 final _phoneController = TextEditingController();
 final _phoneFocus = FocusNode();

 // ── SMS mode ─────────────────────────────────────
 final _codeController = TextEditingController();
 final _codeFocus = FocusNode();
 SmsLoginState _smsState = SmsLoginState.idle;
 String? _smsErrorMessage;
 int _countdownSeconds = 0;
 Timer? _countdownTimer;
 bool _obscureCode = false;

 // ── Password mode ────────────────────────────────
 final _passwordController = TextEditingController();
 final _passwordFocus = FocusNode();
 PasswordLoginState _pwState = PasswordLoginState.idle;
 String? _pwErrorMessage;
 bool _obscurePassword = true;

 // ── Phone regex: supports +86xxxxxxxxxx, xxxxxxxxxxx ─
 static final _phoneRegex = RegExp(r'^(\+?86)?1[3-9]\d{9}$');

 bool get _isPhoneValid => _phoneRegex.hasMatch(_phoneController.text.trim());

 // SMS helpers
 bool get _canSendCode =>
 _isPhoneValid &&
 _smsState != SmsLoginState.sending &&
 _smsState != SmsLoginState.codeSent &&
 _countdownSeconds <= 0;

 bool get _canVerify =>
 _codeController.text.trim().length == 6 &&
 _smsState != SmsLoginState.verifying;

 // Password helpers
 bool get _canPasswordLogin =>
 _isPhoneValid &&
 _passwordController.text.isNotEmpty &&
 _pwState != PasswordLoginState.loading;

 @override
 void initState() {
 super.initState();
 _phoneController.addListener(_onPhoneChanged);
 _codeController.addListener(_onCodeChanged);
 }

 @override
 void dispose() {
 _countdownTimer?.cancel();
 _phoneController.dispose();
 _codeController.dispose();
 _passwordController.dispose();
 _phoneFocus.dispose();
 _codeFocus.dispose();
 _passwordFocus.dispose();
 super.dispose();
 }

 void _onPhoneChanged() {
 if (_smsState == SmsLoginState.phoneInvalid && _isPhoneValid) {
 setState(() {
 _smsState = SmsLoginState.idle;
 _smsErrorMessage = null;
 });
 }
 }

 void _onCodeChanged() {
 if (_codeController.text.trim().length == 6 && _canVerify) {
 _verify();
 }
 }

 // ══════════════════════════════════════════════════
 // SMS Flow
 // ══════════════════════════════════════════════════

 Future<void> _sendCode() async {
 final phone = _phoneController.text.trim();
 if (!_isPhoneValid) {
 setState(() {
 _smsState = SmsLoginState.phoneInvalid;
 _smsErrorMessage = '请输入正确的手机号';
 });
 return;
 }

 setState(() {
 _smsState = SmsLoginState.sending;
 _smsErrorMessage = null;
 });

 try {
 final response = await widget.apiClient.post(
 '/auth/sms/send',
 data: {'phone': phone},
 options: Options(headers: {'Authorization': ''}),
 );

 if (!mounted) return;

 _startCountdown();
 setState(() {
 _smsState = SmsLoginState.codeSent;
 _smsErrorMessage = null;
 });

 _codeFocus.requestFocus();

 final devCode = response.data['dev_code'] as String?;
 if (devCode != null && devCode.isNotEmpty) {
 _codeController.text = devCode;
 }
 } on DioException catch (e) {
 if (!mounted) return;
 _handleSendError(e);
 } catch (e) {
 if (!mounted) return;
 setState(() {
 _smsState = SmsLoginState.networkError;
 _smsErrorMessage = '网络异常，请检查网络后重试';
 });
 }
 }

 void _handleSendError(DioException e) {
 final data = e.response?.data;
 final detail = data is Map<String, dynamic> ? data['detail'] ?? data : data;
 final detailMap = detail is Map<String, dynamic> ? detail : <String, dynamic>{};

 switch (e.response?.statusCode) {
 case 429:
 final code = detailMap['code'] as String? ?? '';
 final message = detailMap['message'] as String? ?? '操作过于频繁，请稍后再试';
 if (code == 'SMS_RATE_LIMITED') {
 final secondsMatch = RegExp(r'(\d+)').firstMatch(message);
 final seconds = int.tryParse(secondsMatch?.group(1) ?? '') ?? 60;
 _startCountdown(seconds);
 setState(() {
 _smsState = SmsLoginState.rateLimited;
 _smsErrorMessage = message;
 });
 } else if (code == 'SMS_LOCKED') {
 setState(() {
 _smsState = SmsLoginState.locked;
 _smsErrorMessage = message;
 });
 } else {
 setState(() {
 _smsState = SmsLoginState.idle;
 _smsErrorMessage = message;
 });
 }
 break;
 default:
 setState(() {
 _smsState = SmsLoginState.networkError;
 _smsErrorMessage = detailMap['message'] as String? ?? '发送失败，请重试';
 });
 }
 }

 Future<void> _verify() async {
 final phone = _phoneController.text.trim();
 final code = _codeController.text.trim();

 if (code.length != 6) return;

 setState(() {
 _smsState = SmsLoginState.verifying;
 _smsErrorMessage = null;
 });

 try {
 final response = await widget.apiClient.post(
 '/auth/sms/verify',
 data: {'phone': phone, 'code': code},
 options: Options(headers: {'Authorization': ''}),
 );

 if (!mounted) return;

 final data = response.data as Map<String, dynamic>;

 await widget.apiClient.authStorage.saveLoginData(
 accessToken: data['access_token'] as String,
 refreshToken: data['refresh_token'] as String?,
 role: data['role'] as String? ?? 'parent',
 mustChangePassword: data['must_change_password'] as bool? ?? false,
 );

 setState(() => _smsState = SmsLoginState.verifyFailed); // will override below
 if (mounted) {
 context.go(RoutePaths.course);
 }
 } on DioException catch (e) {
 if (!mounted) return;
 _handleVerifyError(e);
 } catch (e) {
 if (!mounted) return;
 setState(() {
 _smsState = SmsLoginState.verifyFailed;
 _smsErrorMessage = '网络异常，请检查网络后重试';
 });
 }
 }

 void _handleVerifyError(DioException e) {
 final data = e.response?.data;
 final detail = data is Map<String, dynamic> ? data['detail'] ?? data : data;
 final detailMap = detail is Map<String, dynamic> ? detail : <String, dynamic>{};

 switch (e.response?.statusCode) {
 case 401:
 final message = detailMap['message'] as String? ?? '验证码错误';
 final remaining = detailMap['attempts_remaining'] as int?;
 setState(() {
 _smsState = SmsLoginState.verifyFailed;
 _smsErrorMessage = remaining != null ? '$message，还可尝试$remaining次' : message;
 _codeController.clear();
 });
 _codeFocus.requestFocus();
 break;
 case 429:
 final message = detailMap['message'] as String? ?? '验证失败次数过多，请稍后再试';
 setState(() {
 _smsState = SmsLoginState.locked;
 _smsErrorMessage = message;
 });
 break;
 default:
 setState(() {
 _smsState = SmsLoginState.verifyFailed;
 _smsErrorMessage = detailMap['message'] as String? ?? '验证失败，请重试';
 });
 }
 }

 // ── Countdown Timer ──────────────────────────────
 void _startCountdown([int seconds = 60]) {
 _countdownTimer?.cancel();
 setState(() => _countdownSeconds = seconds);

 _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
 setState(() {
 _countdownSeconds--;
 if (_countdownSeconds <= 0) {
 timer.cancel();
 if (_smsState == SmsLoginState.codeSent || _smsState == SmsLoginState.rateLimited) {
 _smsState = SmsLoginState.idle;
 }
 }
 });
 });
 }

 // ══════════════════════════════════════════════════
 // Password Flow
 // ══════════════════════════════════════════════════

 Future<void> _passwordLogin() async {
 final phone = _phoneController.text.trim();
 final password = _passwordController.text;

 if (!_isPhoneValid) {
 setState(() {
 _pwState = PasswordLoginState.invalidCredentials;
 _pwErrorMessage = '请输入正确的手机号';
 });
 return;
 }

 setState(() {
 _pwState = PasswordLoginState.loading;
 _pwErrorMessage = null;
 });

 try {
 final response = await widget.apiClient.post(
 '/auth/parent/login',
 data: {'phone': phone, 'password': password},
 options: Options(headers: {'Authorization': ''}),
 );

 if (!mounted) return;

 final data = response.data as Map<String, dynamic>;

 await widget.apiClient.authStorage.saveLoginData(
 accessToken: data['access_token'] as String,
 refreshToken: data['refresh_token'] as String?,
 role: data['role'] as String? ?? 'parent',
 mustChangePassword: data['must_change_password'] as bool? ?? false,
 );

 setState(() => _pwState = PasswordLoginState.success);

 if (mounted) {
 context.go(RoutePaths.course);
 }
 } on DioException catch (e) {
 if (!mounted) return;
 _handlePasswordLoginError(e);
 } catch (e) {
 if (!mounted) return;
 setState(() {
 _pwState = PasswordLoginState.networkError;
 _pwErrorMessage = '网络异常，请检查网络后重试';
 });
 }
 }

 void _handlePasswordLoginError(DioException e) {
 final data = e.response?.data;
 final detail = data is Map<String, dynamic> ? data['detail'] ?? data : data;
 final detailMap = detail is Map<String, dynamic> ? detail : <String, dynamic>{};

 switch (e.response?.statusCode) {
 case 401:
 final code = detailMap['code'] as String? ?? '';
 final message = detailMap['message'] as String? ?? '手机号或密码错误';
 if (code == 'PARENT_PASSWORD_NOT_SET') {
 setState(() {
 _pwState = PasswordLoginState.passwordNotSet;
 _pwErrorMessage = '您还未设置密码，请使用验证码登录';
 });
 } else {
 final remaining = detailMap['attempts_remaining'] as int?;
 setState(() {
 _pwState = PasswordLoginState.invalidCredentials;
 _pwErrorMessage = remaining != null
 ? '$message，还可尝试$remaining次'
 : message;
 });
 _passwordController.clear();
 _passwordFocus.requestFocus();
 }
 break;
 case 429:
 final message = detailMap['message'] as String? ?? '登录失败次数过多，请稍后再试';
 setState(() {
 _pwState = PasswordLoginState.locked;
 _pwErrorMessage = message;
 });
 break;
 default:
 setState(() {
 _pwState = PasswordLoginState.networkError;
 _pwErrorMessage = detailMap['message'] as String? ?? '登录失败，请重试';
 });
 }
 }

 // ══════════════════════════════════════════════════
 // Build
 // ══════════════════════════════════════════════════

 @override
 Widget build(BuildContext context) {
 return Scaffold(
 body: SafeArea(
 child: SingleChildScrollView(
 padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
 child: SizedBox(
 height: MediaQuery.of(context).size.height -
 MediaQuery.of(context).padding.top -
 MediaQuery.of(context).padding.bottom,
 child: Column(
 children: [
 const Spacer(flex: 2),
 _buildHeader(),
 const SizedBox(height: AppSpacing.xxl),
 _buildModeToggle(),
 const SizedBox(height: AppSpacing.xl),
 // Phone field (shared)
 _buildPhoneField(),
 const SizedBox(height: AppSpacing.lg),
 // Mode-specific fields
 if (_mode == LoginMode.sms) ...[
 _buildCodeField(),
 ] else ...[
 _buildPasswordField(),
 ],
 const SizedBox(height: 8),
 _buildErrorMessage(),
 const Spacer(flex: 1),
 _buildLoginButton(),
 const SizedBox(height: AppSpacing.xxxl),
 ],
 ),
 ),
 ),
 ),
 );
 }

 Widget _buildHeader() {
 return Column(
 children: [
 Container(
 width: 80,
 height: 80,
 decoration: BoxDecoration(
 color: AppColors.primary.withOpacity(0.1),
 borderRadius: BorderRadius.circular(20),
 ),
 child: const Icon(
 Icons.auto_stories,
 size: 40,
 color: AppColors.primary,
 ),
 ),
 const SizedBox(height: AppSpacing.xl),
 Text(
 'SunnyBridge',
 style: AppTypography.h1.copyWith(color: AppColors.textPrimary),
 ),
 const SizedBox(height: AppSpacing.sm),
 Text(
 '阳光英语 · 学习端',
 style: AppTypography.body.copyWith(color: AppColors.textSecondary),
 ),
 ],
 );
 }

 Widget _buildModeToggle() {
 return Container(
 decoration: BoxDecoration(
 color: AppColors.backgroundVariant,
 borderRadius: BorderRadius.circular(8),
 ),
 child: Row(
 children: [
 Expanded(
 child: GestureDetector(
 onTap: () => setState(() {
 _mode = LoginMode.sms;
 _pwErrorMessage = null;
 _smsErrorMessage = null;
 }),
 child: Container(
 padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
 decoration: BoxDecoration(
 color: _mode == LoginMode.sms
 ? AppColors.primary
 : Colors.transparent,
 borderRadius: BorderRadius.circular(8),
 ),
 child: Text(
 '验证码登录',
 textAlign: TextAlign.center,
 style: AppTypography.body.copyWith(
 color: _mode == LoginMode.sms
 ? AppColors.textWhite
 : AppColors.textSecondary,
 fontWeight: _mode == LoginMode.sms
 ? FontWeight.w600
 : FontWeight.normal,
 ),
 ),
 ),
 ),
 ),
 Expanded(
 child: GestureDetector(
 onTap: () => setState(() {
 _mode = LoginMode.password;
 _smsErrorMessage = null;
 _pwErrorMessage = null;
 }),
 child: Container(
 padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
 decoration: BoxDecoration(
 color: _mode == LoginMode.password
 ? AppColors.primary
 : Colors.transparent,
 borderRadius: BorderRadius.circular(8),
 ),
 child: Text(
 '密码登录',
 textAlign: TextAlign.center,
 style: AppTypography.body.copyWith(
 color: _mode == LoginMode.password
 ? AppColors.textWhite
 : AppColors.textSecondary,
 fontWeight: _mode == LoginMode.password
 ? FontWeight.w600
 : FontWeight.normal,
 ),
 ),
 ),
 ),
 ),
 ],
 ),
 );
 }

 Widget _buildPhoneField() {
 final hasSmsError = _mode == LoginMode.sms && _smsState == SmsLoginState.phoneInvalid;
 final hasPwError = _mode == LoginMode.password && _pwState == PasswordLoginState.invalidCredentials;

 return TextField(
 controller: _phoneController,
 focusNode: _phoneFocus,
 keyboardType: TextInputType.phone,
 maxLength: 13,
 enabled: _mode == LoginMode.sms
 ? _smsState != SmsLoginState.verifying
 : _pwState != PasswordLoginState.loading,
 decoration: InputDecoration(
 labelText: '手机号',
 hintText: '请输入手机号',
 prefixIcon: const Icon(Icons.phone_android, color: AppColors.textHint),
 counterText: '',
 errorText: hasSmsError ? _smsErrorMessage : null,
 ),
 onChanged: (_) {
 if (hasSmsError && _isPhoneValid) {
 setState(() {
 _smsState = SmsLoginState.idle;
 _smsErrorMessage = null;
 });
 }
 },
 );
 }

 Widget _buildCodeField() {
 return Row(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Expanded(
 child: TextField(
 controller: _codeController,
 focusNode: _codeFocus,
 keyboardType: TextInputType.number,
 maxLength: 6,
 obscureText: _obscureCode,
 enabled: _smsState == SmsLoginState.codeSent ||
 _smsState == SmsLoginState.verifyFailed ||
 _smsState == SmsLoginState.idle && _countdownSeconds > 0,
 decoration: InputDecoration(
 labelText: '验证码',
 hintText: '6位数字验证码',
 prefixIcon: const Icon(Icons.sms, color: AppColors.textHint),
 suffixIcon: IconButton(
 icon: Icon(
 _obscureCode ? Icons.visibility_off : Icons.visibility,
 color: AppColors.textHint,
 size: AppSpacing.iconSm,
 ),
 onPressed: () => setState(() => _obscureCode = !_obscureCode),
 ),
 counterText: '',
 ),
 ),
 ),
 const SizedBox(width: AppSpacing.sm),
 SizedBox(
 height: AppSpacing.inputHeight,
 child: _buildSendCodeButton(),
 ),
 ],
 );
 }

 Widget _buildSendCodeButton() {
 final isSending = _smsState == SmsLoginState.sending;
 final isCounting = _countdownSeconds > 0;

 if (isSending) {
 return const ElevatedButton(
 onPressed: null,
 child: SizedBox(
 width: 20,
 height: 20,
 child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.textWhite),
 ),
 );
 }

 if (isCounting) {
 return ElevatedButton(
 onPressed: null,
 child: Text('${_countdownSeconds}s'),
 );
 }

 return ElevatedButton(
 onPressed: _canSendCode ? _sendCode : null,
 child: const Text('发送'),
 );
 }

 Widget _buildPasswordField() {
 return TextFormField(
 controller: _passwordController,
 focusNode: _passwordFocus,
 obscureText: _obscurePassword,
 enabled: _pwState != PasswordLoginState.loading,
 textInputAction: TextInputAction.done,
 onFieldSubmitted: (_) => _canPasswordLogin ? _passwordLogin() : null,
 decoration: InputDecoration(
 labelText: '密码',
 hintText: '请输入密码',
 prefixIcon: const Icon(Icons.lock_outline, color: AppColors.textHint),
 suffixIcon: IconButton(
 icon: Icon(
 _obscurePassword ? Icons.visibility_off : Icons.visibility,
 color: AppColors.textHint,
 size: AppSpacing.iconSm,
 ),
 onPressed: () =>
 setState(() => _obscurePassword = !_obscurePassword),
 ),
 ),
 validator: (value) {
 if (value == null || value.isEmpty) return '请输入密码';
 return null;
 },
 );
 }

 Widget _buildErrorMessage() {
 if (_mode == LoginMode.sms) {
 return _buildSmsErrorMessage();
 } else {
 return _buildPasswordErrorMessage();
 }
 }

 Widget _buildSmsErrorMessage() {
 if (_smsErrorMessage == null) return const SizedBox.shrink();

 final isError = _smsState == SmsLoginState.verifyFailed ||
 _smsState == SmsLoginState.phoneInvalid ||
 _smsState == SmsLoginState.networkError;
 final isWarning = _smsState == SmsLoginState.rateLimited;
 final isLocked = _smsState == SmsLoginState.locked;

 final icon = isLocked
 ? Icons.lock_outline
 : isWarning
 ? Icons.access_time
 : Icons.error_outline;
 final color = isLocked || isError
 ? AppColors.error
 : AppColors.warning;

 return Padding(
 padding: const EdgeInsets.only(top: AppSpacing.sm),
 child: Row(
 children: [
 Icon(icon, size: 16, color: color),
 const SizedBox(width: AppSpacing.xs),
 Expanded(
 child: Text(
 _smsErrorMessage!,
 style: AppTypography.bodySmall.copyWith(color: color),
 ),
 ),
 ],
 ),
 );
 }

 Widget _buildPasswordErrorMessage() {
 if (_pwErrorMessage == null) return const SizedBox.shrink();

 final isError = _pwState == PasswordLoginState.invalidCredentials ||
 _pwState == PasswordLoginState.networkError;
 final isWarning = _pwState == PasswordLoginState.passwordNotSet;
 final isLocked = _pwState == PasswordLoginState.locked;

 final icon = isLocked
 ? Icons.lock_outline
 : isWarning
 ? Icons.info_outline
 : Icons.error_outline;
 final color = isLocked || isError
 ? AppColors.error
 : AppColors.warning;

 return Padding(
 padding: const EdgeInsets.only(top: AppSpacing.sm),
 child: Row(
 children: [
 Icon(icon, size: 16, color: color),
 const SizedBox(width: AppSpacing.xs),
 Expanded(
 child: Text(
 _pwErrorMessage!,
 style: AppTypography.bodySmall.copyWith(color: color),
 ),
 ),
 ],
 ),
 );
 }

 Widget _buildLoginButton() {
 if (_mode == LoginMode.sms) {
 return _buildSmsLoginButton();
 } else {
 return _buildPasswordLoginButton();
 }
 }

 Widget _buildSmsLoginButton() {
 final isVerifying = _smsState == SmsLoginState.verifying;

 return SizedBox(
 width: double.infinity,
 height: AppSpacing.buttonHeight,
 child: ElevatedButton(
 onPressed: _canVerify ? _verify : null,
 style: ElevatedButton.styleFrom(
 backgroundColor: isVerifying ? AppColors.primaryLight : AppColors.primary,
 ),
 child: isVerifying
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
 Text('登录中...'),
 ],
 )
 : const Text('登录'),
 ),
 );
 }

 Widget _buildPasswordLoginButton() {
 final isLoading = _pwState == PasswordLoginState.loading;

 return SizedBox(
 width: double.infinity,
 height: AppSpacing.buttonHeight,
 child: ElevatedButton(
 onPressed: _canPasswordLogin ? _passwordLogin : null,
 style: ElevatedButton.styleFrom(
 backgroundColor: isLoading ? AppColors.primaryLight : AppColors.primary,
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
 Text('登录中...'),
 ],
 )
 : const Text('登录'),
 ),
 );
 }
}
