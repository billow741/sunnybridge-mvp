import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

import '../widgets/teacher_course_card.dart';

/// Teacher courses page — main entry with Tab switching.
///
/// Two tabs: 今日课程 / 全部课程, matching IA.md T-TODAY and T-ALL.
/// Defaults to T-TODAY per FLUTTER-10 requirement.
class TeacherCoursesPage extends StatefulWidget {
  final ApiClient apiClient;

  const TeacherCoursesPage({super.key, required this.apiClient});

  @override
  State<TeacherCoursesPage> createState() => _TeacherCoursesPageState();
}

class _TeacherCoursesPageState extends State<TeacherCoursesPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  // BUG-001: GlobalKeys to access sub-page states for refresh
  // after returning from course detail with feedback submitted.
  final _todayKey = GlobalKey<State<TeacherTodayPage>>();
  final _allKey = GlobalKey<State<TeacherAllPage>>();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: 0, // Default: 今日课程
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _logout(BuildContext context) async {
    try {
      await widget.apiClient.post('/auth/logout');
    } catch (_) {}
    await widget.apiClient.authStorage.clearAll();
    if (context.mounted) {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('课程'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: '退出登录',
            onPressed: () => _logout(context),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          tabs: const [
            Tab(text: '今日课程'),
            Tab(text: '全部课程'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          TeacherTodayPage(
            key: _todayKey,
            apiClient: widget.apiClient,
            onCourseTap: (courseId) => _goToDetail(courseId),
          ),
          TeacherAllPage(
            key: _allKey,
            apiClient: widget.apiClient,
            onCourseTap: (courseId) => _goToDetail(courseId),
          ),
        ],
      ),
    );
  }

  Future<void> _goToDetail(String courseId) async {
    // BUG-001 fix: await push so we can receive the pop result.
    // If the detail page pops with `true` (feedback was submitted),
    // both tab lists need to refresh to reflect the updated status.
    final result = await context.push<bool>('/course-detail/$courseId');
    if (result == true) {
      // Trigger data reload on both tab pages via their state's
      // public refresh methods.
      final todayState = _todayKey.currentState;
      if (todayState != null && todayState.mounted) {
        // Access the private _loadToday via a public method.
        // Since _loadToday is private, we use a workaround:
        // the sub-pages expose a refresh() method.
        (todayState as dynamic).refresh();
      }
      final allState = _allKey.currentState;
      if (allState != null && allState.mounted) {
        (allState as dynamic).refresh();
      }
    }
  }
}

// ─── TeacherTodayPage — 今日课程列表 ─────────────────────────────

/// Today's courses list for the logged-in teacher.
/// Calls GET /courses/today and sorts by start_time ascending.
class TeacherTodayPage extends StatefulWidget {
  final ApiClient apiClient;
  final void Function(String courseId) onCourseTap;

  const TeacherTodayPage({
    super.key,
    required this.apiClient,
    required this.onCourseTap,
  });

  @override
  State<TeacherTodayPage> createState() => _TeacherTodayPageState();
}

enum _ListStatus { loading, loaded, empty, error }

class _TeacherTodayPageState extends State<TeacherTodayPage> {
  _ListStatus _status = _ListStatus.loading;
  List<CourseItem> _courses = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadToday();
  }

  Future<void> _loadToday({bool isRefresh = false}) async {
    if (!isRefresh) {
      setState(() => _status = _ListStatus.loading);
    }

    try {
      final response = await widget.apiClient.get('/courses/today');
      final data = response.data as List<dynamic>;
      final courses = data
          .map((e) => CourseItem.fromJson(e as Map<String, dynamic>))
          .toList();

      // Sort by start_time ascending (API already does, but double-check)
      courses.sort((a, b) => a.startTime.compareTo(b.startTime));

      setState(() {
        _courses = courses;
        _status = courses.isEmpty ? _ListStatus.empty : _ListStatus.loaded;
      });
    } on Exception catch (e) {
      setState(() {
        _status = _ListStatus.error;
        _errorMessage = e.toString();
      });
    }
  }

  /// BUG-001: Public refresh method so the parent page can trigger
  /// a data reload after returning from course detail.
  void refresh() => _loadToday(isRefresh: true);

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => _loadToday(isRefresh: true),
      child: _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_status) {
      case _ListStatus.loading:
        return const LoadingIndicator(message: '加载今日课程...');
      case _ListStatus.empty:
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: const EmptyState(
              icon: Icons.event_available,
              message: '今日暂无课程',
            ),
          ),
        );
      case _ListStatus.error:
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: ErrorRetry(
              message: _errorMessage ?? '加载失败',
              onRetry: () => _loadToday(),
            ),
          ),
        );
      case _ListStatus.loaded:
        return ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: AppSpacing.xl),
          itemCount: _courses.length,
          itemBuilder: (context, index) {
            final course = _courses[index];
            return TeacherCourseCard(
              course: course,
              onTap: () => widget.onCourseTap(course.id),
            );
          },
        );
    }
  }
}

// ─── TeacherAllPage — 全部课程列表 ──────────────────────────────

/// All courses list for the logged-in teacher with month filter.
/// Calls GET /courses/all?month=YYYY-MM (paginated).
class TeacherAllPage extends StatefulWidget {
  final ApiClient apiClient;
  final void Function(String courseId) onCourseTap;

  const TeacherAllPage({
    super.key,
    required this.apiClient,
    required this.onCourseTap,
  });

  @override
  State<TeacherAllPage> createState() => _TeacherAllPageState();
}

class _TeacherAllPageState extends State<TeacherAllPage> {
  _ListStatus _status = _ListStatus.loading;
  List<CourseItem> _courses = [];
  int _total = 0;
  int _page = 1;
  final int _pageSize = 20;
  String? _errorMessage;
  bool _isLoadingMore = false; // guard against duplicate _loadMore() calls

  // Month filter: e.g. "2026-06"
  String _currentMonth;

  _TeacherAllPageState() : _currentMonth = _defaultMonth();

  static String _defaultMonth() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}';
  }

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll({bool isRefresh = false, bool append = false}) async {
    if (!isRefresh && !append) {
      setState(() => _status = _ListStatus.loading);
    }

    try {
      if (!append) _page = 1;

      final response = await widget.apiClient.get('/courses/all', queryParameters: {
        'month': _currentMonth,
        'page': _page,
        'page_size': _pageSize,
      });

      final paginated = PaginatedCourses.fromJson(response.data);

      setState(() {
        if (append) {
          _courses.addAll(paginated.items);
        } else {
          _courses = paginated.items;
        }
        _total = paginated.total;
        _status = _courses.isEmpty ? _ListStatus.empty : _ListStatus.loaded;
      });
    } on Exception catch (e) {
      setState(() {
        _status = _ListStatus.error;
        _errorMessage = e.toString();
      });
    }
  }

  /// BUG-001: Public refresh method so the parent page can trigger
  /// a data reload after returning from course detail.
  void refresh() => _loadAll(isRefresh: true);

  /// Change month filter and reload.
  void _onMonthChanged(String? newMonth) {
    if (newMonth == null) return;
    _currentMonth = newMonth;
    _loadAll();
  }

  /// Load next page for infinite scroll (with duplicate-call guard).
  void _loadMore() {
    if (_isLoadingMore) return;
    if (_courses.length >= _total) return;
    _isLoadingMore = true;
    _page++;
    _loadAll(append: true).whenComplete(() => _isLoadingMore = false);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Month filter bar
        _MonthFilterBar(
          currentMonth: _currentMonth,
          onMonthChanged: _onMonthChanged,
        ),
        // Divider
        const Divider(height: 1, color: AppColors.divider),
        // Course list
        Expanded(child: _buildBody()),
      ],
    );
  }

  Widget _buildBody() {
    switch (_status) {
      case _ListStatus.loading:
        return const LoadingIndicator(message: '加载全部课程...');
      case _ListStatus.empty:
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.5,
            child: EmptyState(
              icon: Icons.calendar_month,
              message: '该月份暂无课程',
              actionLabel: '切换月份',
              onAction: () => _showMonthPicker(),
            ),
          ),
        );
      case _ListStatus.error:
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.5,
            child: ErrorRetry(
              message: _errorMessage ?? '加载失败',
              onRetry: () => _loadAll(),
            ),
          ),
        );
      case _ListStatus.loaded:
        return RefreshIndicator(
          onRefresh: () => _loadAll(isRefresh: true),
          child: NotificationListener<ScrollNotification>(
            onNotification: (scrollInfo) {
              if (scrollInfo.metrics.pixels >=
                  scrollInfo.metrics.maxScrollExtent * 0.9) {
                _loadMore();
              }
              return false;
            },
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: AppSpacing.xl),
              itemCount: _courses.length + 1, // +1 for trailing indicator
              itemBuilder: (context, index) {
                if (index == _courses.length) {
                  // Trailing load indicator
                  if (_courses.length < _total) {
                    return const Padding(
                      padding: EdgeInsets.all(AppSpacing.lg),
                      child: Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                }
                final course = _courses[index];
                return TeacherCourseCard(
                  course: course,
                  onTap: () => widget.onCourseTap(course.id),
                );
              },
            ),
          ),
        );
    }
  }

  /// Open month picker via the shared _MonthFilterBar BottomSheet.
  void _showMonthPicker() {
    _MonthFilterBar.showMonthPicker(
      context,
      currentMonth: _currentMonth,
      onMonthChanged: _onMonthChanged,
    );
  }
}

// ─── _MonthFilterBar — 月份筛选栏 ─────────────────────────────────
class _MonthFilterBar extends StatelessWidget {
  final String currentMonth;
  final void Function(String?)? onMonthChanged;

  const _MonthFilterBar({
    required this.currentMonth,
    this.onMonthChanged,
  });

  /// Month range: 24 months back + 6 months forward from today.
  static const int _pastMonths = 24;
  static const int _futureMonths = 6;

  @override
  Widget build(BuildContext context) {
    final year = currentMonth.split('-')[0];
    final month = currentMonth.split('-')[1];
    final display = '$year年${int.parse(month)}月';

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.sm,
      ),
      child: InkWell(
        onTap: () => showMonthPicker(
          context,
          currentMonth: currentMonth,
          onMonthChanged: onMonthChanged,
        ),
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.calendar_month,
                  size: AppSpacing.iconMd, color: AppColors.textSecondary),
              const SizedBox(width: AppSpacing.xs),
              Text(
                display,
                style: AppTypography.body.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const Icon(Icons.arrow_drop_down,
                  color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }

  /// Shared month picker BottomSheet — used by both the filter bar
  /// and the empty-state "切换月份" action.
  static void showMonthPicker(
    BuildContext context, {
    required String currentMonth,
    void Function(String?)? onMonthChanged,
  }) {
    final now = DateTime.now();
    // Build list from (now - _pastMonths) to (now + _futureMonths)
    final totalCount = _pastMonths + _futureMonths + 1;
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Text('选择月份', style: AppTypography.h2),
            ),
            Expanded(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: totalCount,
                itemBuilder: (context, index) {
                  // index 0 = (now - _pastMonths), ascending
                  final target = DateTime(
                    now.year,
                    now.month - _pastMonths + index,
                    1,
                  );
                  final monthStr =
                      '${target.year}-${target.month.toString().padLeft(2, '0')}';
                  final isSelected = monthStr == currentMonth;
                  return ListTile(
                    title: Text('${target.year}年${target.month}月'),
                    trailing: isSelected
                        ? const Icon(Icons.check, color: AppColors.primary)
                        : null,
                    selected: isSelected,
                    onTap: () {
                      onMonthChanged?.call(monthStr);
                      Navigator.of(ctx).pop();
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
