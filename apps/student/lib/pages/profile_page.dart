import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

/// ProfilePage — S-PROFILE (FLUTTER-05).
///
/// Displays the current parent's child info from GET /api/v1/children/me.
/// Handles four states: loading, empty (no child), error (retry), success.
/// Logout button clears auth storage and redirects to login.
class ProfilePage extends StatefulWidget {
  final ApiClient apiClient;

  const ProfilePage({super.key, required this.apiClient});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  ChildProfile? _child;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchChild();
  }

  Future<void> _fetchChild() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response =
        await widget.apiClient.get('/children/me');

      // API-05 returns a single child object directly (ChildOut).
      final data = response.data;
      if (data == null || data is! Map<String, dynamic>) {
        setState(() {
          _child = null;
          _loading = false;
        });
        return;
      }

      setState(() {
        _child = ChildProfile.fromJson(data);
        _loading = false;
      });
    } on DioException catch (e) {
      // 401/403 handled by AuthInterceptor (auto-redirect to login)
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        return;
      }
      if (e.response?.statusCode == 404) {
        // 404 = no child bound to this parent
        setState(() {
          _child = null;
          _loading = false;
        });
        return;
      }
      setState(() {
        _error = '加载失败，请重试';
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = '加载失败，请重试';
        _loading = false;
      });
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('退出登录'),
        content: const Text('确定要退出登录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text(
              '退出',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    await widget.apiClient.authStorage.clearAll();

    if (mounted) {
      context.go(RoutePaths.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的'),
        actions: [
          TextButton.icon(
            onPressed: _logout,
            icon: const Icon(Icons.logout, size: 18),
            label: const Text('退出'),
          ),
        ],
      ),
      body: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    // ── Loading ──
    if (_loading) {
      return const LoadingIndicator(message: '加载中...');
    }

    // ── Error ──
    if (_error != null) {
      return ErrorRetry(
        message: _error!,
        onRetry: _fetchChild,
      );
    }

    // ── Empty (no child bound) ──
    if (_child == null) {
      return const EmptyState(
        icon: Icons.child_care_outlined,
        message: '尚未绑定孩子信息\n请联系教务老师添加您的孩子',
      );
    }

    // ── Success ──
    return _buildProfileContent(context);
  }

  Widget _buildProfileContent(BuildContext context) {
    final child = _child!;

    return RefreshIndicator(
      onRefresh: _fetchChild,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // ── Child avatar + name section ──
          _buildHeaderSection(child),

          const SizedBox(height: AppSpacing.lg),

          // ── Child info card ──
          _buildInfoCard(child),

          const SizedBox(height: AppSpacing.lg),

          // ── Logout button ──
          SizedBox(
            width: double.infinity,
            height: AppSpacing.buttonHeight,
            child: OutlinedButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout),
              label: const Text('退出登录'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: const BorderSide(color: AppColors.error),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderSection(ChildProfile child) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // ── Avatar ──
          CircleAvatar(
            radius: AppSpacing.avatarLg / 2,
            backgroundColor: AppColors.levelColor(child.level),
            child: Text(
              child.name.isNotEmpty ? child.name[0] : '?',
              style: AppTypography.h2.copyWith(
                color: AppColors.textWhite,
              ),
            ),
          ),

          const SizedBox(width: AppSpacing.lg),

          // ── Name + level ──
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  child.name,
                  style: AppTypography.h2.copyWith(
                    color: AppColors.textPrimary,
                  ),
                ),
                if (child.hasEnglishName) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    child.englishName!,
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.sm),
                _buildLevelBadge(child.level),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLevelBadge(String level) {
    final color = AppColors.levelColor(level);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      ),
      child: Text(
        level,
        style: AppTypography.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildInfoCard(ChildProfile child) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 6,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '孩子信息',
            style: AppTypography.h3.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          _infoRow('姓名', child.name),
          const Divider(height: AppSpacing.xxl),
          _infoRow('英文名', child.englishName ?? '未填写'),
          const Divider(height: AppSpacing.xxl),
          _infoRow('级别', child.levelDisplay),
          if (child.birthDate != null && child.birthDate!.isNotEmpty) ...[
            const Divider(height: AppSpacing.xxl),
            _infoRow('出生日期', child.birthDate!),
          ],
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      children: [
        SizedBox(
          width: 72,
          child: Text(
            label,
            style: AppTypography.body.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Text(
            value,
            style: AppTypography.body.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}