import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../models/course_item.dart';
import '../router/app_router.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../widgets/course_card.dart';
import '../widgets/empty_state.dart';
import '../widgets/error_retry.dart';
import '../widgets/loading_indicator.dart';

// ---------------------------------------------------------------------------
// CoursePage — S-COURSE (TabBar: today / history)
// ---------------------------------------------------------------------------

class CoursePage extends StatefulWidget {
  final ApiClient apiClient;

  const CoursePage({super.key, required this.apiClient});

  @override
  State<CoursePage> createState() => _CoursePageState();
}

class _CoursePageState extends State<CoursePage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('课程'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: '今日课程'),
            Tab(text: '历史课程'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _TodayCourseTab(apiClient: widget.apiClient),
          _HistoryCourseTab(apiClient: widget.apiClient),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _TodayCourseTab — S-COURSE-TODAY
// ---------------------------------------------------------------------------

class _TodayCourseTab extends StatefulWidget {
  final ApiClient apiClient;
  const _TodayCourseTab({required this.apiClient});

  @override
  State<_TodayCourseTab> createState() => _TodayCourseTabState();
}

class _TodayCourseTabState extends State<_TodayCourseTab>
    with AutomaticKeepAliveClientMixin {
  List<CourseItem> _courses = [];
  _LoadState _state = _LoadState.loading;
  String _errorMessage = '';

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _fetchToday();
  }

  Future<void> _fetchToday() async {
    if (!mounted) return;
    setState(() {
      _state = _LoadState.loading;
      _errorMessage = '';
    });

    try {
      final response = await widget.apiClient.dio.get('/api/v1/courses/today');
      final list = (response.data as List)
          .map((e) => CourseItem.fromJson(e as Map<String, dynamic>))
          .toList();

      if (!mounted) return;
      setState(() {
        _courses = list;
        _state = list.isEmpty ? _LoadState.empty : _LoadState.success;
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
    super.build(context);

    switch (_state) {
      case _LoadState.loading:
        return const LoadingIndicator();
      case _LoadState.empty:
        return EmptyState(
          icon: Icons.event_available_outlined,
          message: '今日暂无课程',
          actionLabel: '刷新',
          onAction: _fetchToday,
        );
      case _LoadState.error:
        return ErrorRetry(
          message: _errorMessage,
          onRetry: _fetchToday,
        );
      case _LoadState.success:
        return RefreshIndicator(
          onRefresh: _fetchToday,
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: _courses.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) => CourseCard(
              course: _courses[index],
              onTap: () => _navigateToDetail(_courses[index].id),
            ),
          ),
        );
    }
  }

  void _navigateToDetail(String courseId) {
    context.go('${RoutePaths.course}/$courseId');
  }
}

// ---------------------------------------------------------------------------
// _HistoryCourseTab — S-COURSE-HISTORY (paginated)
// ---------------------------------------------------------------------------

class _HistoryCourseTab extends StatefulWidget {
  final ApiClient apiClient;
  const _HistoryCourseTab({required this.apiClient});

  @override
  State<_HistoryCourseTab> createState() => _HistoryCourseTabState();
}

class _HistoryCourseTabState extends State<_HistoryCourseTab>
    with AutomaticKeepAliveClientMixin {
  List<CourseItem> _courses = [];
  _LoadState _state = _LoadState.loading;
  String _errorMessage = '';
  int _currentPage = 1;
  int _total = 0;
  bool _loadingMore = false;

  static const _pageSize = 20;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  bool get _hasMore => _courses.length < _total;

  Future<void> _fetchHistory({bool refresh = false}) async {
    if (!mounted) return;

    if (refresh) {
      _currentPage = 1;
      _courses = [];
    }

    setState(() {
      if (_courses.isEmpty) {
        _state = _LoadState.loading;
      } else {
        _loadingMore = true;
      }
      _errorMessage = '';
    });

    try {
      final response = await widget.apiClient.dio.get(
        '/api/v1/courses/history',
        queryParameters: {
          'page': _currentPage,
          'page_size': _pageSize,
        },
      );
      final paginated = PaginatedCourses.fromJson(response.data);

      if (!mounted) return;
      setState(() {
        if (refresh) {
          _courses = paginated.items;
        } else {
          _courses.addAll(paginated.items);
        }
        _total = paginated.total;
        _currentPage = paginated.page;
        _state = _courses.isEmpty ? _LoadState.empty : _LoadState.success;
        _loadingMore = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        if (_courses.isEmpty) {
          _state = _LoadState.error;
        }
        _loadingMore = false;
        _errorMessage = _extractErrorMessage(e);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (_courses.isEmpty) {
          _state = _LoadState.error;
        }
        _loadingMore = false;
        _errorMessage = '加载失败，请重试';
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore) return;
    _currentPage++;
    await _fetchHistory();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    switch (_state) {
      case _LoadState.loading:
        return const LoadingIndicator();
      case _LoadState.empty:
        return EmptyState(
          icon: Icons.history_outlined,
          message: '暂无历史课程',
          actionLabel: '刷新',
          onAction: () => _fetchHistory(refresh: true),
        );
      case _LoadState.error:
        return ErrorRetry(
          message: _errorMessage,
          onRetry: () => _fetchHistory(refresh: true),
        );
      case _LoadState.success:
        return RefreshIndicator(
          onRefresh: () => _fetchHistory(refresh: true),
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: _courses.length + (_hasMore ? 1 : 0),
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              // Load-more trigger
              if (index == _courses.length) {
                // Schedule load more after frame
                WidgetsBinding.instance.addPostFrameCallback((_) => _loadMore());
                return const Padding(
                  padding: EdgeInsets.all(AppSpacing.md),
                  child: Center(child: SizedBox(
                    width: 24, height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )),
                );
              }

              return CourseCard(
                course: _courses[index],
                onTap: () => _navigateToDetail(_courses[index].id),
              );
            },
          ),
        );
    }
  }

  void _navigateToDetail(String courseId) {
    context.go('${RoutePaths.course}/$courseId');
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

enum _LoadState { loading, success, empty, error }

String _extractErrorMessage(DioException e) {
  // Try to read structured error from backend
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
