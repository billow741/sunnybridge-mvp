import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

import '../app.dart';

/// Teacher login page states.
enum TeacherLoginState {
 idle,
 loading,
 success,
 invalidCredentials,
 locked,
 networkError,
}

/// T-LOGIN: Teacher username + password login page.
///
/// Flow:
/// 1. Enter username + password
/// 2. Tap login → POST /auth/teacher/login
/// 3. On success → save JWT + role + must_change_password
/// 4. must_change_password=true → navigate to /change-password
/// 5. must_change_password=false → navigate to /home
class TeacherLoginPage extends StatefulWidget {
 final ApiClient apiClient;

 const TeacherLoginPage({super.key, required this.apiClient});

 @override
 State<TeacherLoginPage> createState() => _TeacherLoginPageState();
}

class _TeacherLoginPageState extends State<TeacherLoginPage> {
 // ── Controllers ──────────────────────────────────
 final _usernameController = TextEditingController();
 final _passwordController = TextEditingController();
 final _usernameFocus = FocusNode();
 final _passwordFocus = FocusNode();
 final _formKey = GlobalKey<FormState>();

 // ── State ────────────────────────────────────────
 TeacherLoginState _state = TeacherLoginState.idle;
 String? _errorMessage;
 bool _obscurePassword = true;
 bool _autoValidate = false;

 bool get _isUsernameValid =>
 _usernameController.text.trim().isNotEmpty;

 bool get _isPasswordValid =>
 _passwordController.text.isNotEmpty;

 bool get _canLogin =>
 _isUsernameValid &&
 _isPasswordValid &&
 _state != TeacherLoginState.loading;

 @override
 void dispose() {
 _usernameController.dispose();
 _passwordController.dispose();
 _usernameFocus.dispose();
 _passwordFocus.dispose();
 super.dispose();
 }

 // ── Login ────────────────────────────────────────
 Future<void> _login() async {
 if (!_formKey.currentState!.validate()) {
 setState(() => _autoValidate = true);
 return;
 }

 final username = _usernameController.text.trim();
 final password = _passwordController.text;

 setState(() {
 _state = TeacherLoginState.loading;
 _errorMessage = null;
 });

 try {
 final response = await widget.apiClient.post(
 '/auth/teacher/login',
 data: {'username': username, 'password': password},
 options: Options(headers: {'Authorization': ''}), // no auth needed
 );

 if (!mounted) return;

 final data = response.data as Map<String, dynamic>;

 // Save all auth data
 await widget.apiClient.authStorage.saveLoginData(
 accessToken: data['access_token'] as String,
 refreshToken: data['refresh_token'] as String?,
 role: data['role'] as String? ?? 'teacher',
 mustChangePassword: data['must_change_password'] as bool? ?? false,
 );

 setState(() => _state = TeacherLoginState.success);

 // Navigate based on must_change_password
 if (mounted) {
 final mustChange = data['must_change_password'] as bool? ?? false;
 if (mustChange) {
 context.go(TeacherRoutePaths.changePassword);
 } else {
 context.go(TeacherRoutePaths.courses);
 }
 }
 } on DioException catch (e) {
 if (!mounted) return;
 _handleLoginError(e);
 } catch (e) {
 if (!mounted) return;
 setState(() {
 _state = TeacherLoginState.networkError;
 _errorMessage = '网络异常，请检查网络后重试';
 });
 }
 }

 void _handleLoginError(DioException e) {
 final data = e.response?.data;
 final detail =
 data is Map<String, dynamic> ? data['detail'] ?? data : data;
 final detailMap =
 detail is Map<String, dynamic> ? detail : <String, dynamic>{};

 switch (e.response?.statusCode) {
 case 401:
 // TEACHER_INVALID_CREDENTIALS (includes non-existent username,
 // inactive teacher, wrong password — all same error to prevent
 // username enumeration)
 final message =
 detailMap['message'] as String? ?? '用户名或密码错误';
 final remaining = detailMap['attempts_remaining'] as int?;
 setState(() {
 _state = TeacherLoginState.invalidCredentials;
 _errorMessage = remaining != null
 ? '$message，还可尝试$remaining次'
 : message;
 });
 _passwordController.clear();
 _passwordFocus.requestFocus();
 break;
 case 429:
 // TEACHER_LOCKED — too many failed attempts
 final message =
 detailMap['message'] as String? ?? '登录失败次数过多，请稍后再试';
 setState(() {
 _state = TeacherLoginState.locked;
 _errorMessage = message;
 });
 break;
 default:
 setState(() {
 _state = TeacherLoginState.networkError;
 _errorMessage =
 detailMap['message'] as String? ?? '登录失败，请重试';
 });
 }
 }

 // ── Build ────────────────────────────────────────
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
 const SizedBox(height: AppSpacing.xxxl),
 _buildForm(),
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
 Icons.school,
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
 '阳光英语 · 教师端',
 style:
 AppTypography.body.copyWith(color: AppColors.textSecondary),
 ),
 ],
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
 // Username field
 TextFormField(
 controller: _usernameController,
 focusNode: _usernameFocus,
 keyboardType: TextInputType.text,
 maxLength: 50,
 enabled: _state != TeacherLoginState.loading,
 textInputAction: TextInputAction.next,
 onFieldSubmitted: (_) => _passwordFocus.requestFocus(),
 decoration: InputDecoration(
 labelText: '用户名',
 hintText: '请输入用户名',
 prefixIcon: const Icon(Icons.person,
 color: AppColors.textHint),
 counterText: '',
 ),
 validator: (value) {
 if (value == null || value.trim().isEmpty) {
 return '请输入用户名';
 }
 return null;
 },
 ),
 const SizedBox(height: AppSpacing.lg),
 // Password field
 TextFormField(
 controller: _passwordController,
 focusNode: _passwordFocus,
 obscureText: _obscurePassword,
 enabled: _state != TeacherLoginState.loading,
 textInputAction: TextInputAction.done,
 onFieldSubmitted: (_) => _canLogin ? _login() : null,
 decoration: InputDecoration(
 labelText: '密码',
 hintText: '请输入密码',
 prefixIcon:
 const Icon(Icons.lock_outline, color: AppColors.textHint),
 suffixIcon: IconButton(
 icon: Icon(
 _obscurePassword
 ? Icons.visibility_off
 : Icons.visibility,
 color: AppColors.textHint,
 size: AppSpacing.iconSm,
 ),
 onPressed: () =>
 setState(() => _obscurePassword = !_obscurePassword),
 ),
 ),
 validator: (value) {
 if (value == null || value.isEmpty) {
 return '请输入密码';
 }
 return null;
 },
 ),
 ],
 ),
 );
 }

 Widget _buildErrorMessage() {
 if (_errorMessage == null) return const SizedBox.shrink();

 final isError = _state == TeacherLoginState.invalidCredentials ||
 _state == TeacherLoginState.networkError;
 final isLocked = _state == TeacherLoginState.locked;

 final icon = isLocked ? Icons.lock_outline : Icons.error_outline;
 final color = isLocked || isError ? AppColors.error : AppColors.warning;

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

 Widget _buildLoginButton() {
 final isLoading = _state == TeacherLoginState.loading;

 return SizedBox(
 width: double.infinity,
 height: AppSpacing.buttonHeight,
 child: ElevatedButton(
 onPressed: _canLogin ? _login : null,
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
 Text('登录中...'),
 ],
 )
 : const Text('登录'),
 ),
 );
 }
}
