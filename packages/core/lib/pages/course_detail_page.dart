import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/api_client.dart';
import '../models/course_item.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../widgets/error_retry.dart';
import '../widgets/loading_indicator.dart';

// ---------------------------------------------------------------------------
// CourseDetailPage — S-COURSE-DETAIL
// ---------------------------------------------------------------------------

class CourseDetailPage extends StatefulWidget {
  final String courseId;
  final ApiClient apiClient;

  const CourseDetailPage({
    super.key,
    required this.courseId,
    required this.apiClient,
  });

  @override
  State<CourseDetailPage> createState() => _CourseDetailPageState();
}

class _CourseDetailPageState extends State<CourseDetailPage> {
  CourseDetailItem? _detail;
  _LoadState _state = _LoadState.loading;
  String _errorMessage = '';

  /// Tracks if feedback sections are expanded (for long content).
  bool _feedbackExpanded = true;
  bool _homeworkExpanded = true;
  bool _notesExpanded = true;

  @override
  void initState() {
    super.initState();
    _fetchDetail();
  }

  Future<void> _fetchDetail() async {
    if (!mounted) return;
    setState(() {
      _state = _LoadState.loading;
      _errorMessage = '';
    });

    try {
      final response = await widget.apiClient.dio
          .get('/api/v1/courses/${widget.courseId}');
      final detail = CourseDetailItem.fromJson(
        response.data as Map<String, dynamic>,
      );

      if (!mounted) return;
      setState(() {
        _detail = detail;
        _state = _LoadState.success;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _state = _LoadState.error;
        _errorMessage = _extractErrorMessage(e);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _state = _LoadState.error;
        _errorMessage = '加载失败，请重试';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // softer for readability
      appBar: AppBar(
        title: const Text('课程详情'),
      ),
      body: Builder(builder: (context) {
        switch (_state) {
          case _LoadState.loading:
            return const LoadingIndicator();
          case _LoadState.error:
            return ErrorRetry(
              message: _errorMessage,
              onRetry: _fetchDetail,
            );
          case _LoadState.success:
            if (_detail == null) return const SizedBox.shrink();
            return _buildDetailBody();
        }
      }),
    );
  }

  Widget _buildDetailBody() {
    final course = _detail!.course;
    final feedback = _detail!.feedback;
    final hasMeetingLink =
        course.meetingLink != null && course.meetingLink!.isNotEmpty;
    final isPending = course.status == 'pending';

    return RefreshIndicator(
      onRefresh: _fetchDetail,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Course info card ──
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${_formatDate(course.date)} · ${_formatTime(course.startTime)}-${_formatTime(course.endTime)}',
                                  style: AppTypography.body.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              _StatusChip(status: course.status),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.md),
                          _InfoRow(icon: Icons.person, label: '教师', value: course.teacher?.name ?? '教师'),
                          _InfoRow(icon: Icons.child_care, label: '学生', value: course.childrenNames),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.md),

                  // ── Meeting link button (only pending + has link) ──
                  if (isPending && hasMeetingLink) ...[
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        key: const ValueKey('joinMeetingBtn'),
                        onPressed: () => _openMeetingLink(course.meetingLink!),
                        icon: const Icon(Icons.videocam, color: Colors.white),
                        label: const Text(
                          '进入课堂',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ] else if (course.status == 'cancelled') ...[
                    _buildInfoBanner(
                      icon: Icons.cancel,
                      color: AppColors.error,
                      text: '本课程已取消',
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ] else if (!isPending) ...[
                    _buildInfoBanner(
                      icon: Icons.check_circle,
                      color: AppColors.success,
                      text: '本课程已结束',
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ] else if (isPending && !hasMeetingLink) ...[
                    _buildInfoBanner(
                      icon: Icons.info_outline,
                      color: AppColors.textSecondary,
                      text: '腾讯会议链接尚未生成',
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],

                  // ── Feedback section ──
                  if (feedback != null) ...[
                    Text(
                      '课程反馈',
                      style: AppTypography.body.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _ExpandableSection(
                              title: '课堂内容',
                              content: feedback.content,
                              expanded: _feedbackExpanded,
                              onToggle: (v) => setState(() => _feedbackExpanded = v),
                            ),
                            if (feedback.homework != null && feedback.homework!.isNotEmpty) ...[
                              const Divider(height: AppSpacing.lg),
                              _ExpandableSection(
                                title: '课后作业',
                                content: feedback.homework!,
                                expanded: _homeworkExpanded,
                                onToggle: (v) => setState(() => _homeworkExpanded = v),
                              ),
                            ],
                            if (feedback.notes != null && feedback.notes!.isNotEmpty) ...[
                              const Divider(height: AppSpacing.lg),
                              _ExpandableSection(
                                title: '备注',
                                content: feedback.notes!,
                                expanded: _notesExpanded,
                                onToggle: (v) => setState(() => _notesExpanded = v),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ] else ...[
                    _buildNoFeedbackBanner(),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Tries to launch the meeting link.
  ///   1. wemeet:// scheme → tries to open native Tencent Meeting app
  ///   2. If that fails → falls back to https:// browser URL
  Future<void> _openMeetingLink(String link) async {
    if (link.startsWith('wemeet://')) {
      final uri = Uri.parse(link);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return;
      }
      // fallback: extract https link from wemeet:// scheme or use as-is
      // For MVP, try to open https equivalent in browser
      final fallbackUri = Uri.parse(link.replaceFirst('wemeet://', 'https://'));
      if (await canLaunchUrl(fallbackUri)) {
        await launchUrl(fallbackUri);
        return;
      }
    }

    // direct https link
    final uri = Uri.parse(link);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      return;
    }

    // all failed
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('无法打开课堂链接')),
      );
    }
  }

  Widget _buildInfoBanner({
    required IconData icon,
    required Color color,
    required String text,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              text,
              style: AppTypography.body.copyWith(color: color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoFeedbackBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Icon(
            Icons.chat_bubble_outline,
            size: 48,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '教师尚未填写反馈',
            style: AppTypography.body.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'pending' => ('待上课', AppColors.primary),
      'completed' => ('已完成', AppColors.success),
      'cancelled' => ('已取消', AppColors.error),
      _ => ('', AppColors.textSecondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: AppTypography.caption.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: AppSpacing.sm),
          Text(
            '$label：',
            style: AppTypography.body.copyWith(color: AppColors.textSecondary),
          ),
          Text(value, style: AppTypography.body),
        ],
      ),
    );
  }
}

class _ExpandableSection extends StatefulWidget {
  final String title;
  final String content;
  final bool expanded;
  final ValueChanged<bool> onToggle;

  const _ExpandableSection({
    required this.title,
    required this.content,
    required this.expanded,
    required this.onToggle,
  });

  @override
  State<_ExpandableSection> createState() => _ExpandableSectionState();
}

class _ExpandableSectionState extends State<_ExpandableSection> {
  bool _expanded = true;

  final int _maxLines = 5;

  @override
  void initState() {
    super.initState();
    _expanded = widget.expanded;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () {
            setState(() => _expanded = !_expanded);
            widget.onToggle(_expanded);
          },
          child: Row(
            children: [
              Expanded(
                child: Text(
                  widget.title,
                  style: AppTypography.body.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Icon(
                _expanded ? Icons.expand_less : Icons.expand_more,
                size: 20,
                color: AppColors.textSecondary,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        AnimatedCrossFade(
          firstChild: Text(
            widget.content,
            maxLines: _maxLines,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.body.copyWith(
              color: AppColors.textPrimary,
              height: 1.5,
            ),
          ),
          secondChild: Text(
            widget.content,
            style: AppTypography.body.copyWith(
              color: AppColors.textPrimary,
              height: 1.5,
            ),
          ),
          crossFadeState: _expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// State & helpers
// ---------------------------------------------------------------------------

enum _LoadState { loading, success, error }

String _extractErrorMessage(DioException e) {
  final data = e.response?.data;
  if (data is Map<String, dynamic>) {
    final detail = data['detail'];
    if (detail is Map<String, dynamic>) {
      return detail['message'] as String? ?? '请求失败';
    }
    if (detail is String) return detail;
  }
  switch (e.type) {
    case DioExceptionType.connectionError:
    case DioExceptionType.connectionTimeout:
      return '网络连接失败，请检查网络';
    case DioExceptionType.receiveTimeout:
      return '请求超时，请重试';
    default:
      return '加载失败 (${e.response?.statusCode ?? '未知'})';
  }
}

// Date/time formatting helpers
String _formatDate(String isoDate) {
  try {
    final dt = DateTime.parse(isoDate);
    final weekday = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][dt.weekday - 1];
    return '${dt.month}月${dt.day}日 $weekday';
  } catch (_) {
    return isoDate;
  }
}

String _formatTime(String time) {
  // "14:00:00" → "14:00"
  if (time.length >= 5) return time.substring(0, 5);
  return time;
}
