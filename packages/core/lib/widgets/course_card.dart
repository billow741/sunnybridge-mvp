import 'package:flutter/material.dart';
import '../models/course_item.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';

/// Course card widget for displaying course summaries.
///
/// Used in today/history course lists (S-COURSE-TODAY / S-COURSE-HISTORY).
/// Renders directly from [CourseItem] — date, time, teacher name,
/// children names, and course status chip.
class CourseCard extends StatelessWidget {
  final CourseItem course;
  final VoidCallback? onTap;

  const CourseCard({
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
        return '待上课';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      key: ValueKey('courseCard_${course.id}'),
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

              // ── Info row: date · time · teacher ────────────────
              Row(
                children: [
                  const Icon(Icons.calendar_today_outlined,
                      size: AppSpacing.iconSm, color: AppColors.textSecondary),
                  const SizedBox(width: AppSpacing.xs),
                  Text(course.date, style: AppTypography.bodySmall),
                  const SizedBox(width: AppSpacing.md),
                  const Icon(Icons.access_time,
                      size: AppSpacing.iconSm, color: AppColors.textSecondary),
                  const SizedBox(width: AppSpacing.xs),
                  Text(course.timeRange, style: AppTypography.bodySmall),
                  const SizedBox(width: AppSpacing.md),
                  const Icon(Icons.person_outline,
                      size: AppSpacing.iconSm, color: AppColors.textSecondary),
                  const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: Text(
                      course.teacherDisplayName,
                      style: AppTypography.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
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
                    Icon(Icons.videocam_outlined,
                        size: AppSpacing.iconSm, color: AppColors.primary),
                    const SizedBox(width: AppSpacing.xs),
                    Text('有课堂链接',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.primary,
                        )),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
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
          horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
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
