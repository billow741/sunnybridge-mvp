import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:pdfrx/pdfrx.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

/// LibraryReaderPage — S-LIBRARY-READER (FLUTTER-07).
///
/// Opens a reading material PDF via pdfrx, restores last reading position,
/// saves progress on page changes (throttled) and on exit.
///
/// Route: /library/:materialId/read
/// Depends on FLUTTER-06 (LibraryPage) for navigation entry.

class LibraryReaderPage extends StatefulWidget {
  final ApiClient apiClient;
  final String materialId;

  const LibraryReaderPage({
    super.key,
    required this.apiClient,
    required this.materialId,
  });

  @override
  State<LibraryReaderPage> createState() => _LibraryReaderPageState();
}

class _LibraryReaderPageState extends State<LibraryReaderPage> {
  // ── PDF controller ──────────────────────────────
  PdfViewerController? _pdfController;

  // ── Data ─────────────────────────────────────────
  String? _title;
  String? _pdfUrl;
  int _pageCount = 0;
  int _currentPage = 1;
  bool _completed = false;

  // ── State ────────────────────────────────────────
  bool _loadingDetail = true;
  bool _loadingPdf = false;
  String? _loadError;

  // ── Progress save throttle ───────────────────────
  Timer? _saveThrottle;
  int _lastSavedPage = 0;
  bool _lastSavedCompleted = false;
  bool _saving = false;
  bool _saveError = false;

  @override
  void initState() {
    super.initState();
    _loadMaterial();
  }

  @override
  void dispose() {
    _saveThrottle?.cancel();
    _loadTimeoutTimer?.cancel();
    _saveNow(); // save on exit
    _pdfController?.dispose();
    super.dispose();
  }

  // ── Load material detail ─────────────────────────

  static const _loadTimeout = Duration(seconds: 15);
  Timer? _loadTimeoutTimer;

  Future<void> _loadMaterial() async {
    _loadTimeoutTimer?.cancel();
    setState(() {
      _loadingDetail = true;
      _loadError = null;
    });

    // ── Timeout guard: if API hangs, show error instead of infinite spinner ──
    _loadTimeoutTimer = Timer(_loadTimeout, () {
      if (mounted && _loadingDetail) {
        setState(() {
          _loadError = '加载超时，请检查网络后重试';
          _loadingDetail = false;
        });
      }
    });

    try {
      final response = await widget.apiClient.get(
        '/reading/materials/${widget.materialId}',
      ).timeout(_loadTimeout);

      final data = response.data as Map<String, dynamic>;
      _title = data['title'] as String? ?? '阅读';
      _pdfUrl = data['signed_pdf_url'] as String? ??
          data['pdf_url'] as String?;
      _pageCount = (data['page_count'] as int?) ?? 0;

      if (_pdfUrl == null || _pdfUrl!.isEmpty) {
        _loadTimeoutTimer?.cancel();
        if (mounted) {
          setState(() {
            _loadError = 'PDF 文件不可用，请联系管理员上传';
            _loadingDetail = false;
          });
        }
        return;
      }

      // Restore last position from existing progress
      final progress = await _fetchProgress();
      if (progress != null) {
        _currentPage = progress['current_page'] as int? ?? 1;
        _completed = progress['completed'] as bool? ?? false;
      }

      // Clamp to valid range
      if (_pageCount > 0) {
        _currentPage = _currentPage.clamp(1, _pageCount);
      }

      _lastSavedPage = _currentPage;
      _lastSavedCompleted = _completed;

      // If already completed, start from page 1 (TECH-SPEC: re-read)
      if (_completed) {
        _currentPage = 1;
        _completed = false;
      }

      setState(() {
        _loadingDetail = false;
        _loadingPdf = true;
      });
      _loadTimeoutTimer?.cancel();
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        _loadTimeoutTimer?.cancel();
        return; // AuthInterceptor handles redirect
      }
      _loadTimeoutTimer?.cancel();
      if (mounted) {
        setState(() {
          _loadError = '加载失败，请重试';
          _loadingDetail = false;
        });
      }
    } on TimeoutException {
      _loadTimeoutTimer?.cancel();
      if (mounted) {
        setState(() {
          _loadError = '加载超时，请检查网络后重试';
          _loadingDetail = false;
        });
      }
    } catch (_) {
      _loadTimeoutTimer?.cancel();
      if (mounted) {
        setState(() {
          _loadError = '加载失败，请重试';
          _loadingDetail = false;
        });
      }
    }
  }

  // ── Fetch existing progress ──────────────────────

  Future<Map<String, dynamic>?> _fetchProgress() async {
    try {
      final res = await widget.apiClient
          .get('/reading/progress')
          .timeout(const Duration(seconds: 10));
      final list = res.data as List;
      for (final p in list) {
        if (p['material_id'] == widget.materialId) {
          return p;
        }
      }
    } catch (_) {
      // Progress fetch is best-effort — silently skip
    }
    return null;
  }

  // ── Page change handler (from pdfrx) ─────────────

  void _onPageChanged(int pageNumber) {
    setState(() {
      _currentPage = pageNumber;
    });

    // ── Check last page → mark completed ──
    final atLastPage =
        _pageCount > 0 && pageNumber >= _pageCount;
    if (atLastPage && !_completed) {
      setState(() {
        _completed = true;
      });
    }

    // ── Throttled save ──
    _saveThrottle?.cancel();
    _saveThrottle = Timer(const Duration(milliseconds: 800), () {
      _saveIfChanged();
    });
  }

  // ── Save logic ───────────────────────────────────

  void _saveIfChanged() {
    if (_currentPage == _lastSavedPage &&
        _completed == _lastSavedCompleted) {
      return;
    }
    _performSave();
  }

  Future<void> _saveNow() async {
    _saveThrottle?.cancel();
    if (_currentPage == _lastSavedPage &&
        _completed == _lastSavedCompleted) {
      return;
    }
    await _performSave();
  }

  Future<void> _performSave() async {
    if (_saving) return;
    _saving = true;

    try {
      final clampedPage = _pageCount > 0
          ? _currentPage.clamp(1, _pageCount)
          : _currentPage;

      await widget.apiClient.put(
        '/reading/progress/${widget.materialId}',
        data: {
          'current_page': clampedPage,
        },
      );

      _lastSavedPage = clampedPage;
      _lastSavedCompleted = _completed;
      if (mounted) {
        setState(() {
          _saveError = false;
        });
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        return; // AuthInterceptor handles redirect
      }
      if (mounted) {
        setState(() {
          _saveError = true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _saveError = true;
        });
      }
    } finally {
      _saving = false;
    }
  }

  // ── Build ────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_title ?? '阅读'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            _saveNow();
            context.pop();
          },
        ),
        actions: [
          // ── Page indicator ──
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: AppSpacing.md),
              child: Text(
                _pageCount > 0
                    ? '$_currentPage / $_pageCount'
                    : '第 $_currentPage 页',
                style: AppTypography.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ),
        ],
        bottom: _saveError
            ? PreferredSize(
                preferredSize: const Size.fromHeight(4),
                child: Container(
                  height: 2,
                  color: AppColors.error,
                ),
              )
            : null,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    // ── Loading ──
    if (_loadingDetail) {
      return const LoadingIndicator(message: '加载中...');
    }

    // ── Error ──
    if (_loadError != null) {
      return ErrorRetry(
        message: _loadError!,
        onRetry: _loadMaterial,
      );
    }

    // ── PDF URL resolved — show pdfrx ──
    if (_pdfUrl != null && _pdfUrl!.isNotEmpty) {
      return Stack(
        children: [
          // ── PDF viewer ──
          PdfViewer.uri(
            _pdfUrl!,
            controller: _pdfController,
            params: PdfViewerParams(
              initialPageNumber: _currentPage,
              onViewerReady: (document, controller) {
                _pdfController = controller;
                setState(() {
                  _loadingPdf = false;
                });
                // Jump to last page
                if (_currentPage > 1) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    controller.goToPage(pageNumber: _currentPage);
                  });
                }
              },
              onPageChanged: (pageNumber) {
                _onPageChanged(pageNumber ?? _currentPage);
              },
            ),
            errorBuilder: (context, error, stackTrace) {
              return _buildPdfError(error);
            },
            loadingBuilder: (context) {
              return _buildPdfLoading();
            },
          ),

          // ── Loading overlay for PDF ──
          if (_loadingPdf) _buildPdfLoading(),

          // ── Save error toast ──
          if (_saveError)
            Positioned(
              bottom: AppSpacing.md,
              left: AppSpacing.md,
              right: AppSpacing.md,
              child: Material(
                elevation: 2,
                borderRadius:
                    BorderRadius.circular(AppSpacing.buttonRadius),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withOpacity(0.95),
                    borderRadius:
                        BorderRadius.circular(AppSpacing.buttonRadius),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '进度保存失败',
                        style: TextStyle(color: Colors.white, fontSize: 13),
                      ),
                      TextButton(
                        onPressed: _performSave,
                        child: const Text(
                          '重试',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      );
    }

    // ── Fallback: should never reach here ──
    return ErrorRetry(
      message: 'PDF URL 不可用',
      onRetry: _loadMaterial,
    );
  }

  Widget _buildPdfLoading() {
    return const Center(
      child: LoadingIndicator(message: '加载 PDF...'),
    );
  }

  Widget _buildPdfError(Object error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: AppColors.error),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'PDF 加载失败',
              style: AppTypography.body.copyWith(
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '请检查网络连接后重试',
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton.icon(
              onPressed: _loadMaterial,
              icon: const Icon(Icons.refresh),
              label: const Text('重试'),
            ),
          ],
        ),
      ),
    );
  }

  // ── Back handler ─────────────────────────────────

  @override
  Future<bool> didPopRoute() async {
    await _saveNow();
    return false; // let the caller handle the actual pop
  }
}