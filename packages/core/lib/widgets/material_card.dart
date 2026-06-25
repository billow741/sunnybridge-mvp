import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';

/// Reading material card widget for the library page (S-LIBRARY).
///
/// Shows cover placeholder, title, level badge, category, and read status.
class MaterialCard extends StatelessWidget {
  final String title;
  final String level; // CEFR: starter,A1,A2,B1,B2,C1,C2
  final String category; // picture_book / short_text / story / read_aloud
  final bool isRead;
  final VoidCallback? onTap;

  const MaterialCard({
    super.key,
    required this.title,
    required this.level,
    required this.category,
    this.isRead = false,
    this.onTap,
  });

  String get _categoryLabel {
    switch (category) {
      case 'picture_book':
        return '绘本';
      case 'short_text':
        return '短文';
      case 'story':
        return '故事';
      case 'read_aloud':
        return '跟读';
      default:
        return category;
    }
  }

  @override
  Widget build(BuildContext context) {
    final levelColor = AppColors.levelColor(level);

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.cardPadding),
          child: Row(
            children: [
              // Cover placeholder
              Container(
                width: 56,
                height: 72,
                decoration: BoxDecoration(
                  color: levelColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Icon(Icons.menu_book_outlined,
                      color: levelColor, size: AppSpacing.iconLg),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              // Text content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTypography.h3,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        _LevelBadge(level: level, color: levelColor),
                        const SizedBox(width: AppSpacing.sm),
                        _CategoryBadge(label: _categoryLabel),
                      ],
                    ),
                  ],
                ),
              ),
              // Read status
              if (isRead)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text('已读',
                      style: AppTypography.caption.copyWith(
                          color: AppColors.success,
                          fontWeight: FontWeight.w600)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LevelBadge extends StatelessWidget {
  final String level;
  final Color color;

  const _LevelBadge({required this.level, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(level,
          style: AppTypography.caption.copyWith(
              color: color, fontWeight: FontWeight.w600)),
    );
  }
}

class _CategoryBadge extends StatelessWidget {
  final String label;

  const _CategoryBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(label,
          style: AppTypography.caption.copyWith(
              color: AppColors.textSecondary)),
    );
  }
}
