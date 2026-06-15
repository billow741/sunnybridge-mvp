import 'package:flutter/material.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

/// Teacher course card — shows "待反馈" / "已完成" status.
///
/// Unlike student-side [CourseCard], this uses teacher-centric labels:
/// - 'pending' → "待反馈"
/// - 'completed' → "已完成"
/// - 'cancelled' → "已取消"
class TeacherCourseCard extends StatelessWidget {
  final CourseItem course;
  final VoidCallback? onTap;

  const TeacherCourseCard({
    super.key,
    required this.course,
    this.onTap,
  });

  Color get _statusColor {
    switch (course.status) {
      case 'completed':
        return AppColors.success;
      case 'cancelled':
        return AppColors.textHint;
      case 'pending':
      default:
        return AppColors.warning;
    }
  }

  String get _statusLabel {
    switch (course.status) {
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      case 'pending':
      default:
        return '待反馈';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      key: ValueKey('teacherCourseCard_${course.id}'),
      elevation: AppSpacing.cardElevation,
      margin: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.sm,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.cardPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Top row: children names + status chip ──────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      course.childrenNames.isNotEmpty
                          ? course.childrenNames
                          : '未分配学生',
                      style: AppTypography.h3,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _StatusChip(color: _statusColor, label: _statusLabel),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),

              // ── Info row: date · time ──────────────────────────
              Row(
                children: [
                  const Icon(
                    Icons.calendar_today_outlined,
                    size: AppSpacing.iconSm,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    _formatDate(course.date),
                    style: AppTypography.bodySmall,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  const Icon(
                    Icons.access_time,
                    size: AppSpacing.iconSm,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    course.timeRange,
                    style: AppTypography.bodySmall,
                  ),
                ],
              ),

              // ── Meeting link hint (if present & pending) ───────
              if (course.meetingLink != null &&
                  course.meetingLink!.isNotEmpty &&
                  course.status == 'pending') ...[
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Icon(
                      Icons.videocam_outlined,
                      size: AppSpacing.iconSm,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      '有课堂链接',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],

              // ── Action hint: pending → show "click to view", completed → show "view feedback" ──
              if (course.status == 'pending') ...[
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: AppSpacing.iconSm,
                      color: AppColors.textSecondary,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      '点击查看课程详情',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ] else if (course.status == 'completed') ...[
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Icon(
                      Icons.rate_review_outlined,
                      size: AppSpacing.iconSm,
                      color: AppColors.success,
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Text(
                      '点击查看课后反馈',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.success,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// Format "2026-06-04" → "6月4日".
  static String _formatDate(String iso) {
    try {
      final parts = iso.split('-');
      final month = int.parse(parts[1]);
      final day = int.parse(parts[2]);
      return '${month}月$day日';
    } catch (_) {
      return iso;
    }
  }
}

class _StatusChip extends StatelessWidget {
  final Color color;
  final String label;

  const _StatusChip({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
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
