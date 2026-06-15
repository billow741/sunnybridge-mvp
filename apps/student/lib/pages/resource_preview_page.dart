import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:pdfrx/pdfrx.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

/// ResourcePreviewPage — S-RESOURCE-PREVIEW (FLUTTER-08).
///
/// Opens a resource PDF via pdfrx for preview.
/// Unlike LibraryReaderPage, this does NOT:
///   - Save or restore reading progress
///   - Track completion
///   - Throttle saves
///
/// Route: /resource/:resourceId/preview
/// Depends on FLUTTER-08 (ResourcePage) for navigation entry.

class ResourcePreviewPage extends StatefulWidget {
  final ApiClient apiClient;
  final String resourceId;
  final String? title; // optional, passed from list page

  const ResourcePreviewPage({
    super.key,
    required this.apiClient,
    required this.resourceId,
    this.title,
  });

  @override
  State<ResourcePreviewPage> createState() => _ResourcePreviewPageState();
}

class _ResourcePreviewPageState extends State<ResourcePreviewPage> {
  // ── PDF controller ──────────────────────────────
  PdfViewerController? _pdfController;

  // ── Data ─────────────────────────────────────────
  String _title = '';
  String? _pdfUrl;
  int _pageCount = 0;
  int _currentPage = 1;

  // ── State ────────────────────────────────────────
  bool _loadingDetail = true;
  bool _loadingPdf = false;
  String? _loadError;

  // ── Timeout guard ──────────────────────────────
  static const _loadTimeout = Duration(seconds: 15);
  Timer? _loadTimeoutTimer;

  @override
  void initState() {
    super.initState();
    _title = widget.title ?? '资源预览';
    _loadDetail();
  }

  @override
  void dispose() {
    _loadTimeoutTimer?.cancel();
    _pdfController?.dispose();
    super.dispose();
  }

  // ── Load resource detail (get signed PDF URL) ───

  Future<void> _loadDetail() async {
    _loadTimeoutTimer?.cancel();
    setState(() {
      _loadingDetail = true;
      _loadError = null;
    });

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
        '/resources/${widget.resourceId}',
      ).timeout(_loadTimeout);

      final data = response.data as Map<String, dynamic>;
      final detail = ResourceDetail.fromJson(data);

      _title = detail.title;
      _pageCount = 0; // ResourceOut doesn't include page_count
      _pdfUrl = detail.signedPdfUrl ?? detail.pdfUrl;

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

  // ── Build ──────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _title,
          overflow: TextOverflow.ellipsis,
        ),
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
        onRetry: _loadDetail,
      );
    }

    // ── PDF URL resolved — show pdfrx ──
    if (_pdfUrl != null && _pdfUrl!.isNotEmpty) {
      return Stack(
        children: [
          PdfViewer.uri(
            _pdfUrl!,
            controller: _pdfController,
            params: PdfViewerParams(
              onPageChanged: (pageNumber) {
                if (pageNumber != null && mounted) {
                  setState(() {
                    _currentPage = pageNumber;
                  });
                }
              },
            ),
            errorBuilder: (context, error, stackTrace) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.xxl),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline,
                          size: 64, color: AppColors.error),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        'PDF 加载失败',
                        style: AppTypography.body.copyWith(
                          color: AppColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      ElevatedButton(
                        onPressed: _loadDetail,
                        child: const Text('重试'),
                      ),
                    ],
                  ),
                ),
              );
            },
            loadingBuilder: (context) {
              return const Center(
                child: LoadingIndicator(message: '加载 PDF...'),
              );
            },
          ),

          // ── Loading overlay ──
          if (_loadingPdf)
            const Center(
              child: LoadingIndicator(message: '加载 PDF...'),
            ),
        ],
      );
    }

    // ── Fallback: no PDF available ──
    return const EmptyState(
      icon: Icons.picture_as_pdf_outlined,
      message: 'PDF 文件不可用',
    );
  }
}
