import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

// ---------------------------------------------------------------------------
// ResourcePage — S-RESOURCE (FLUTTER-08)
// ---------------------------------------------------------------------------

class ResourcePage extends StatefulWidget {
  final ApiClient apiClient;

  const ResourcePage({super.key, required this.apiClient});

  @override
  State<ResourcePage> createState() => _ResourcePageState();
}

class _ResourcePageState extends State<ResourcePage> {
  // ── Data ──────────────────────────────────────────
  List<Resource> _allResources = [];
  List<Resource> _filteredResources = [];

  // ── State ─────────────────────────────────────────
  bool _loading = true;
  String? _error;

  // ── Filters ───────────────────────────────────────
  String? _selectedCategory;

  // ── Category definitions (match backend schema) ──
  static const _categories = [
    {'value': 'phonics', 'label': '自然拼读'},
    {'value': 'word_card', 'label': '单词卡'},
    {'value': 'recommended', 'label': '推荐资源'},
  ];

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
      final response = await widget.apiClient.get(
        '/resources',
        queryParameters: {
          'is_active': true,
          'page_size': 200, // fetch all active resources
        },
      );

      final paginated =
          PaginatedResources.fromJson(response.data as Map<String, dynamic>);

      // Sort by sort_order ascending (backend already sorts, but ensure)
      final items = List<Resource>.from(paginated.items)
        ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

      setState(() {
        _allResources = items;
        _loading = false;
      });
      _applyFilters(); // outside setState — avoids nested setState
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
    var items = _allResources;

    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
      items = items.where((r) => r.category == _selectedCategory).toList();
    }

    _filteredResources = items;
  }

  void _setCategory(String? category) {
    setState(() {
      _selectedCategory = category;
      _applyFilters();
    });
  }

  void _navigateToPreview(Resource resource) {
    if (!resource.canPreview) return;
    context.push(
      '${RoutePaths.resource}/${resource.id}/preview',
      extra: {'title': resource.title},
    );
  }

  // ── Build ───────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('资源库'),
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
          // ── Category filter row ──
          _buildCategoryFilter(),

          // ── Resource list ──
          Expanded(
            child:
                _filteredResources.isEmpty ? _buildEmpty() : _buildList(),
          ),
        ],
      ),
    );
  }

  // ── Category filter chips ──────────────────────────

  Widget _buildCategoryFilter() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _categoryChip('全部', null),
            ..._categories.map(
              (c) => _categoryChip(
                c['label'] as String,
                c['value'] as String,
              ),
            ),
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

  // ── Empty state ────────────────────────────────────

  Widget _buildEmpty() {
    return const EmptyState(
      icon: Icons.folder_open_outlined,
      message: '当前分类暂无资源',
    );
  }

  // ── Resource list ──────────────────────────────────

  Widget _buildList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      itemCount: _filteredResources.length,
      itemBuilder: (context, index) {
        final resource = _filteredResources[index];
        return _buildResourceCard(resource);
      },
    );
  }

  Widget _buildResourceCard(Resource resource) {
    final canPreview = resource.canPreview;

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: InkWell(
        onTap: canPreview ? () => _navigateToPreview(resource) : null,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.cardPadding),
          child: Row(
            children: [
              // ── Icon ──
              _buildIcon(resource),

              const SizedBox(width: AppSpacing.md),

              // ── Info ──
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      resource.title,
                      style: AppTypography.body.copyWith(
                        fontWeight: FontWeight.w600,
                        color: canPreview
                            ? AppColors.textPrimary
                            : AppColors.textHint,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    const SizedBox(height: AppSpacing.xs),

                    // Category tag
                    _buildCategoryTag(resource),
                  ],
                ),
              ),

              const SizedBox(width: AppSpacing.sm),

              // ── Preview indicator ──
              if (canPreview)
                const Icon(
                  Icons.chevron_right,
                  color: AppColors.textHint,
                )
              else
                _buildUnavailableBadge(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIcon(Resource resource) {
    // Icon color by category
    final Color iconColor;
    switch (resource.category) {
      case 'phonics':
        iconColor = const Color(0xFF4ECDC4); // Teal
        break;
      case 'word_card':
        iconColor = const Color(0xFF45B7D1); // Sky
        break;
      case 'recommended':
        iconColor = AppColors.accent; // Warm orange
        break;
      default:
        iconColor = AppColors.textHint;
    }

    return Container(
      width: 56,
      height: 72,
      decoration: BoxDecoration(
        color: iconColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Center(
        child: Icon(
          resource.canPreview ? Icons.picture_as_pdf : Icons.picture_as_pdf_outlined,
          color: iconColor,
          size: AppSpacing.iconLg,
        ),
      ),
    );
  }

  Widget _buildCategoryTag(Resource resource) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 1,
      ),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        resource.categoryLabel,
        style: AppTypography.caption.copyWith(
          color: AppColors.primary,
          fontSize: 10,
        ),
      ),
    );
  }

  Widget _buildUnavailableBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: AppColors.textHint.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        '暂不可预览',
        style: AppTypography.caption.copyWith(
          color: AppColors.textHint,
          fontSize: 10,
        ),
      ),
    );
  }
}
