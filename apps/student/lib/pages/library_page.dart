import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

/// ViewModel: merged reading material + progress state.
class LibraryItem {
  final ReadingMaterial material;
  final ReadingProgress? progress;

  const LibraryItem({required this.material, this.progress});

  bool get isNotStarted => progress == null;
  bool get isInProgress => progress != null && !progress!.completed;
  bool get isCompleted => progress?.completed == true;

  String get statusLabel {
    if (isCompleted) return '已完成';
    if (isInProgress) return '进行中';
    return '未开始';
  }
}

// ---------------------------------------------------------------------------
// LibraryPage — S-LIBRARY (FLUTTER-06)
// ---------------------------------------------------------------------------

class LibraryPage extends StatefulWidget {
  final ApiClient apiClient;

  const LibraryPage({super.key, required this.apiClient});

  @override
  State<LibraryPage> createState() => _LibraryPageState();
}

class _LibraryPageState extends State<LibraryPage> {
  // ── Data ──────────────────────────────────────────
  List<LibraryItem> _allItems = [];
  List<LibraryItem> _filteredItems = [];

  // ── State ─────────────────────────────────────────
  bool _loading = true;
  String? _error;

  // ── Filters ───────────────────────────────────────
  String? _childLevel; // fetched from /children/me
  String? _selectedLevel;
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // Fetch child profile + materials + progress in parallel
      final results = await Future.wait([
        widget.apiClient.get('/children/me'),
        widget.apiClient.get('/reading/materials', queryParameters: {
          'is_active': true,
          'page_size': 200, // fetch all active materials
        }),
        widget.apiClient.get('/reading/progress'),
      ]);

      // Parse child profile for default level
      final childData = results[0].data;
      if (childData is Map<String, dynamic>) {
        _childLevel = childData['level'] as String?;
      }

      // Parse materials
      final paginated = PaginatedMaterials.fromJson(
          results[1].data as Map<String, dynamic>);

      // Parse progress
      final progressList = (results[2].data as List)
          .map((e) =>
              ReadingProgress.fromJson(e as Map<String, dynamic>))
          .toList();

      // Merge: material + progress
      final merged = paginated.items.map((m) {
        final progress = progressList.cast<ReadingProgress?>().firstWhere(
              (p) => p?.materialId == m.id,
              orElse: () => null,
            );
        return LibraryItem(material: m, progress: progress);
      }).toList();

      // Sort by sort_order then title
      merged.sort((a, b) {
        final orderCmp =
            a.material.sortOrder.compareTo(b.material.sortOrder);
        if (orderCmp != 0) return orderCmp;
        return a.material.title.compareTo(b.material.title);
      });

      setState(() {
        _allItems = merged;
        _selectedLevel = _childLevel;
        _loading = false;
        _applyFilters();
      });
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        // AuthInterceptor handles auto-redirect
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

  void _applyFilters() {
    var items = _allItems;

    // Level filter
    if (_selectedLevel != null && _selectedLevel!.isNotEmpty) {
      items = items
          .where((item) => item.material.level == _selectedLevel)
          .toList();
    }

    // Category filter
    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
      items = items
          .where((item) => item.material.category == _selectedCategory)
          .toList();
    }

    _filteredItems = items;
  }

  void _setLevel(String? level) {
    setState(() {
      _selectedLevel = level;
      _applyFilters();
    });
  }

  void _setCategory(String? category) {
    setState(() {
      _selectedCategory = category;
      _applyFilters();
    });
  }

  void _navigateToReader(LibraryItem item) {
    context.push('${RoutePaths.library}/${item.material.id}/read');
  }

  // ── Category chip options ───────────────────────────
  static const _categories = [
    {'value': 'picture_book', 'label': '绘本'},
    {'value': 'short_text', 'label': '短文'},
    {'value': 'story', 'label': '故事'},
    {'value': 'read_aloud', 'label': '跟读'},
  ];

  static const _levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

  // ── Build ───────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('阅读馆'),
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
        onRetry: _loadData,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: Column(
        children: [
          // ── Level filter row ──
          _buildLevelFilter(),

          // ── Category filter row ──
          _buildCategoryFilter(),

          // ── Material list ──
          Expanded(
            child: _filteredItems.isEmpty ? _buildEmpty() : _buildList(),
          ),
        ],
      ),
    );
  }

  Widget _buildLevelFilter() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _levelChip('全部', null),
            ..._levels.map((lvl) => _levelChip(lvl, lvl)),
          ],
        ),
      ),
    );
  }

  Widget _levelChip(String label, String? value) {
    final isSelected = _selectedLevel == value;
    final isCurrentLevel = value == _childLevel && _childLevel != null;

    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.xs),
      child: FilterChip(
        label: Text(
          isCurrentLevel ? '$label ⭐' : label,
          style: TextStyle(
            fontSize: 12,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
        selected: isSelected,
        backgroundColor: AppColors.cardBackground,
        selectedColor: AppColors.levelColor(value ?? 'L1'),
        onSelected: (_) => _setLevel(value),
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Widget _buildCategoryFilter() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _categoryChip('全部', null),
            ..._categories.map((c) => _categoryChip(
                  c['label'] as String,
                  c['value'] as String,
                )),
          ],
        ),
      ),
    );
  }

  Widget _categoryChip(String label, String? value) {
    final isSelected = _selectedCategory == value;
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.xs),
      child: FilterChip(
        label: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isSelected ? AppColors.primary : AppColors.textSecondary,
          ),
        ),
        selected: isSelected,
        backgroundColor: AppColors.cardBackground,
        selectedColor: AppColors.primary.withOpacity(0.12),
        onSelected: (_) => _setCategory(value),
        visualDensity: VisualDensity.compact,
        side: BorderSide(
          color: isSelected ? AppColors.primary : AppColors.textHint,
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return const EmptyState(
      icon: Icons.menu_book_outlined,
      message: '暂无可读材料',
    );
  }

  Widget _buildList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      itemCount: _filteredItems.length,
      itemBuilder: (context, index) {
        final item = _filteredItems[index];
        return _buildMaterialCard(item);
      },
    );
  }

  Widget _buildMaterialCard(LibraryItem item) {
    final m = item.material;

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: InkWell(
        onTap: () => _navigateToReader(item),
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.cardPadding),
          child: Row(
            children: [
              // ── Cover image ──
              _buildCover(m.coverUrl),

              const SizedBox(width: AppSpacing.md),

              // ── Info ──
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      m.title,
                      style: AppTypography.body.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    const SizedBox(height: AppSpacing.xs),

                    // Level + Category tags
                    Row(
                      children: [
                        _buildTag(m.level, AppColors.levelColor(m.level)),
                        const SizedBox(width: AppSpacing.xs),
                        _buildTag(m.categoryLabel, AppColors.primary),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.sm),

                    // Progress bar + status
                    _buildProgressSection(item),
                  ],
                ),
              ),

              // ── Arrow ──
              const Icon(
                Icons.chevron_right,
                color: AppColors.textHint,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCover(String? coverUrl) {
    if (coverUrl == null || coverUrl.isEmpty) {
      return Container(
        width: 60,
        height: 80,
        decoration: BoxDecoration(
          color: AppColors.textHint.withOpacity(0.15),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(
          Icons.menu_book,
          color: AppColors.textHint,
          size: 28,
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        coverUrl,
        width: 60,
        height: 80,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          width: 60,
          height: 80,
          decoration: BoxDecoration(
            color: AppColors.textHint.withOpacity(0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(
            Icons.menu_book,
            color: AppColors.textHint,
            size: 28,
          ),
        ),
      ),
    );
  }

  Widget _buildTag(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 1,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: AppTypography.caption.copyWith(
          color: color,
          fontSize: 10,
        ),
      ),
    );
  }

  Widget _buildProgressSection(LibraryItem item) {
    final m = item.material;

    // Completed
    if (item.isCompleted) {
      return Row(
        children: [
          Icon(Icons.check_circle, size: 16, color: AppColors.success),
          const SizedBox(width: AppSpacing.xs),
          Text(
            '已完成',
            style: AppTypography.caption.copyWith(
              color: AppColors.success,
            ),
          ),
        ],
      );
    }

    // In progress — show progress bar
    if (item.isInProgress && item.progress != null) {
      final p = item.progress!;
      final progress = m.pageCount > 0 ? p.currentPage / m.pageCount : 0.0;
      return Row(
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress.clamp(0.0, 1.0),
                minHeight: 6,
                backgroundColor: AppColors.textHint,
                valueColor: AlwaysStoppedAnimation(AppColors.primary),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Text(
            '${p.currentPage}/${m.pageCount}页',
            style: AppTypography.caption.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      );
    }

    // Not started
    return Text(
      '未开始阅读',
      style: AppTypography.caption.copyWith(
        color: AppColors.textHint,
      ),
    );
  }
}