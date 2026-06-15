import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

/// Teacher course detail page — T-TODAY-DETAIL / T-ALL-DETAIL.
///
/// Displays course info (date, time, status, students, meeting link)
/// and allows the teacher to create or edit post-class feedback.
///
/// Route: /course-detail/:courseId
///
/// State machine:
///   loading → loaded(view) ↔ loaded(edit)
///   loaded(edit) → submitting → loaded(view) [on success]
///   any → error [on API failure] → loaded(view) [on retry]
class TeacherCourseDetailPage extends StatefulWidget {
  final ApiClient apiClient;
  final String courseId;

  const TeacherCourseDetailPage({
    super.key,
    required this.apiClient,
    required this.courseId,
  });

  @override
  State<TeacherCourseDetailPage> createState() =>
      _TeacherCourseDetailPageState();
}

// ── Page-level status ──────────────────────────────────
enum _PageStatus { loading, loaded, error }

// ── Feedback mode ──────────────────────────────────────
enum _FeedbackMode { view, edit }

class _TeacherCourseDetailPageState extends State<TeacherCourseDetailPage> {
  _PageStatus _status = _PageStatus.loading;
  String? _errorMessage;

  CourseDetailItem? _detail;
  _FeedbackMode _feedbackMode = _FeedbackMode.view;
  bool _isSubmitting = false;

  // ── Form controllers ────────────────────────────────
  late TextEditingController _contentController;
  late TextEditingController _homeworkController;
  late TextEditingController _notesController;
  String? _contentError; // validation error for content field

  @override
  void initState() {
    super.initState();
    _contentController = TextEditingController();
    _homeworkController = TextEditingController();
    _notesController = TextEditingController();
    _loadCourseDetail();
  }

  @override
  void dispose() {
    _contentController.dispose();
    _homeworkController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  // ── API calls ───────────────────────────────────────

  Future<void> _loadCourseDetail() async {
    setState(() {
      _status = _PageStatus.loading;
      _errorMessage = null;
    });

    try {
      final response = await widget.apiClient.get(
        '/courses/${widget.courseId}',
      );
      final data = response.data as Map<String, dynamic>;
      final detail = CourseDetailItem.fromJson(data);

      // If no feedback exists and feedback editing is allowed,
      // default to edit mode so teacher can create.
      // BUG-002: cancelled courses cannot receive feedback.
      final hasFeedback = detail.feedback != null;
      final isCancelled = detail.course.status == 'cancelled';
      final initialMode = (hasFeedback || isCancelled)
          ? _FeedbackMode.view
          : _FeedbackMode.edit;

      setState(() {
        _detail = detail;
        _feedbackMode = initialMode;
        _status = _PageStatus.loaded;
      });

      // Pre-fill form controllers
      _syncControllersFromDetail();
    } on Exception catch (e) {
      final msg = _extractErrorMessage(e);
      setState(() {
        _status = _PageStatus.error;
        _errorMessage = msg;
      });
    }
  }

  // Whether feedback editing is allowed (BUG-002: cancelled courses
  // cannot receive feedback per PRD 9.4.2 precondition).
  bool get _canEditFeedback => _detail?.course.status != 'cancelled';

  /// Sync form controllers with current feedback data.
  void _syncControllersFromDetail() {
    final fb = _detail?.feedback;
    _contentController.text = fb?.content ?? '';
    _homeworkController.text = fb?.homework ?? '';
    _notesController.text = fb?.notes ?? '';
    _contentError = null;
  }

  Future<void> _submitFeedback() async {
    // ── Frontend validation ──────────────────────────
    final content = _contentController.text.trim();
    if (content.isEmpty) {
      setState(() => _contentError = '课堂内容不能为空');
      return;
    }
    setState(() => _contentError = null);

    setState(() => _isSubmitting = true);

    final payload = {
      'content': content,
      'homework': _homeworkController.text.trim().isNotEmpty
          ? _homeworkController.text.trim()
          : null,
      'notes': _notesController.text.trim().isNotEmpty
          ? _notesController.text.trim()
          : null,
    };

    try {
      final hasExistingFeedback = _detail?.feedback != null;

      if (hasExistingFeedback) {
        // PUT — update existing feedback
        await widget.apiClient.put(
          '/courses/${widget.courseId}/feedback',
          data: payload,
        );
      } else {
        // POST — create new feedback
        await widget.apiClient.post(
          '/courses/${widget.courseId}/feedback',
          data: payload,
        );
      }

      // Success — DB trigger auto-marks course as completed.
      // Try to reload detail for local state consistency, but
      // a refresh failure must NOT overwrite the success state
      // (BUG-003 fix).
      try {
        await _loadCourseDetail();
      } on Exception {
        // Refresh failed — feedback was still saved successfully.
        // Just switch to view mode with whatever data we have.
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('反馈已保存，刷新课程信息失败'),
              backgroundColor: AppColors.warning,
              duration: Duration(seconds: 2),
            ),
          );
        }
      }

      // Switch to view mode after successful submit
      setState(() => _feedbackMode = _FeedbackMode.view);

      if (mounted) {
        // BUG-001: Return to course list so it can refresh status.
        // Pop with `true` to signal that feedback was submitted,
        // allowing the list page to reload and show "已完成".
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('反馈保存成功'),
            backgroundColor: AppColors.success,
            duration: Duration(seconds: 2),
          ),
        );
        context.pop(true);
      }
    } on Exception catch (e) {
      final errorCode = _extractErrorCode(e);

      if (mounted) {
        String userMessage;
        switch (errorCode) {
          case 'FEEDBACK_ALREADY_EXISTS':
            userMessage = '该课程已有反馈，请刷新后编辑';
            // BUG-005: Auto-refresh detail so the page reflects
            // the existing feedback and switches to view mode.
            _loadCourseDetail();
            break;
          case 'NOT_COURSE_TEACHER':
            userMessage = '只有本课程授课教师才能提交反馈';
            break;
          case 'NOT_FEEDBACK_AUTHOR':
            userMessage = '只有反馈作者才能修改反馈';
            break;
          default:
            userMessage = '保存失败，请重试';
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(userMessage),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  // ── Error helpers ───────────────────────────────────

  /// Extract user-friendly error message from Dio exception.
  String _extractErrorMessage(Exception e) {
    final msg = e.toString();
    // Try to extract detail.message from API error response
    final messageMatch = RegExp(r'"message"\s*:\s*"([^"]+)"').firstMatch(msg);
    if (messageMatch != null) return messageMatch[1]!;

    if (msg.contains('401') || msg.contains('403')) {
      return '权限不足或登录已过期';
    }
    if (msg.contains('404')) {
      return '课程不存在';
    }
    if (msg.contains('Connection') || msg.contains('SocketException')) {
      return '网络连接失败，请检查网络';
    }
    return '加载失败，请重试';
  }

  /// Extract error code from Dio exception detail.
  String? _extractErrorCode(Exception e) {
    final msg = e.toString();
    final codeMatch = RegExp(r'"code"\s*:\s*"([^"]+)"').firstMatch(msg);
    return codeMatch?[1];
  }

  // ── Build ───────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('课程详情'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_status) {
      case _PageStatus.loading:
        return const LoadingIndicator(message: '加载课程详情...');
      case _PageStatus.error:
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: ErrorRetry(
              message: _errorMessage ?? '加载失败',
              onRetry: () => _loadCourseDetail(),
            ),
          ),
        );
      case _PageStatus.loaded:
        return _buildLoadedBody();
    }
  }

  Widget _buildLoadedBody() {
    final course = _detail!.course;
    final feedback = _detail!.feedback;

    return RefreshIndicator(
      onRefresh: () => _loadCourseDetail(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Course info section ────────────────────
            _CourseInfoCard(course: course),
            const SizedBox(height: AppSpacing.lg),

            // ── Feedback section ───────────────────────
            _FeedbackSection(
              feedback: feedback,
              mode: _feedbackMode,
              isSubmitting: _isSubmitting,
              isFeedbackAllowed: _canEditFeedback,
              contentController: _contentController,
              homeworkController: _homeworkController,
              notesController: _notesController,
              contentError: _contentError,
              onEdit: () {
                if (!_canEditFeedback) return;
                _syncControllersFromDetail();
                setState(() => _feedbackMode = _FeedbackMode.edit);
              },
              onCancel: () {
                _syncControllersFromDetail();
                setState(() => _feedbackMode = _FeedbackMode.view);
              },
              onSubmit: () => _submitFeedback(),
              onContentChanged: (value) {
                if (_contentError != null && value.trim().isNotEmpty) {
                  setState(() => _contentError = null);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════
// _CourseInfoCard — 课程基础信息卡片
// ══════════════════════════════════════════════════════════

class _CourseInfoCard extends StatelessWidget {
  final CourseItem course;

  const _CourseInfoCard({required this.course});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: AppSpacing.cardElevation,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.cardPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Status badge + date ─────────────────
            Row(
              children: [
                _StatusBadge(status: course.status),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  _formatDate(course.date),
                  style: AppTypography.h3,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // ── Time ────────────────────────────────
            _InfoRow(
              icon: Icons.access_time,
              label: '上课时间',
              value: course.timeRange,
            ),
            const SizedBox(height: AppSpacing.sm),

            // ── Students ────────────────────────────
            if (course.children.isNotEmpty) ...[
              _InfoRow(
                icon: Icons.people_outline,
                label: '学生',
                value: course.childrenNames,
              ),
              const SizedBox(height: AppSpacing.sm),
            ],

            // ── Meeting link ────────────────────────
            if (course.meetingLink != null &&
                course.meetingLink!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.xs),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.video_call, size: 18),
                  label: const Text('进入腾讯会议'),
                  onPressed: () => _launchMeetingLink(context, course.meetingLink!),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.circular(AppSpacing.buttonRadius),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(String isoDate) {
    try {
      final parts = isoDate.split('-');
      if (parts.length == 3) {
        return '${parts[0]}年${int.parse(parts[1])}月${int.parse(parts[2])}日';
      }
    } catch (_) {}
    return isoDate;
  }

  // BUG-004: Temporary implementation until url_launcher is
  // integrated in FLUTTER-12. Copy the link to clipboard so
  // the user can paste it into the Tencent Meeting app.
  void _launchMeetingLink(BuildContext context, String url) {
    Clipboard.setData(ClipboardData(text: url));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('会议链接已复制，请在腾讯会议中粘贴打开'),
        backgroundColor: AppColors.success,
        duration: Duration(seconds: 3),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════
// _StatusBadge — 课程状态标签
// ══════════════════════════════════════════════════════════

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'pending' => ('待反馈', AppColors.warning),
      'completed' => ('已完成', AppColors.success),
      'cancelled' => ('已取消', AppColors.textHint),
      _ => ('未知', AppColors.textHint),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs / 2,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      ),
      child: Text(
        label,
        style: AppTypography.bodySmall.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════
// _InfoRow — 通用信息行
// ══════════════════════════════════════════════════════════

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
    return Row(
      children: [
        Icon(icon, size: AppSpacing.iconSm, color: AppColors.textSecondary),
        const SizedBox(width: AppSpacing.xs),
        Text(
          label,
          style: AppTypography.bodySmall.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            value,
            style: AppTypography.body.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════
// _FeedbackSection — 反馈展示/编辑区域
// ══════════════════════════════════════════════════════════

class _FeedbackSection extends StatelessWidget {
  final FeedbackBrief? feedback;
  final _FeedbackMode mode;
  final bool isSubmitting;
  final bool isFeedbackAllowed;

  final TextEditingController contentController;
  final TextEditingController homeworkController;
  final TextEditingController notesController;
  final String? contentError;

  final VoidCallback onEdit;
  final VoidCallback onCancel;
  final VoidCallback onSubmit;
  final ValueChanged<String> onContentChanged;

  const _FeedbackSection({
    required this.feedback,
    required this.mode,
    required this.isSubmitting,
    required this.isFeedbackAllowed,
    required this.contentController,
    required this.homeworkController,
    required this.notesController,
    required this.contentError,
    required this.onEdit,
    required this.onCancel,
    required this.onSubmit,
    required this.onContentChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: AppSpacing.cardElevation,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.cardPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ──────────────────────────────
            Row(
              children: [
                const Icon(Icons.rate_review_outlined,
                    size: AppSpacing.iconMd, color: AppColors.primary),
                const SizedBox(width: AppSpacing.sm),
                Text('课后反馈', style: AppTypography.h3),
                const Spacer(),
                // BUG-002: hide edit button for cancelled courses
                if (mode == _FeedbackMode.view &&
                    feedback != null &&
                    isFeedbackAllowed)
                  TextButton.icon(
                    key: const ValueKey('feedbackEditBtn'),
                    onPressed: onEdit,
                    icon: const Icon(Icons.edit_outlined, size: 16),
                    label: const Text('编辑'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primary,
                    ),
                  ),
              ],
            ),
            const Divider(height: AppSpacing.xl),

            // ── Body ────────────────────────────────
            // BUG-002: cancelled courses show a disabled message
            if (!isFeedbackAllowed) ...[
              _buildCancelledState(),
            ] else if (mode == _FeedbackMode.view) ...[
              feedback != null
                  ? _buildViewMode()
                  : _buildEmptyState(),
            ] else ...[
              _buildEditMode(),
            ],
          ],
        ),
      ),
    );
  }

  // ── View mode ──────────────────────────────────────

  Widget _buildViewMode() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Content (required field)
        _FeedbackFieldView(
          label: '课堂内容',
          value: feedback!.content,
          isRequired: true,
        ),
        const SizedBox(height: AppSpacing.md),

        // Homework (optional)
        _FeedbackFieldView(
          label: '作业',
          value: feedback!.homework,
        ),
        const SizedBox(height: AppSpacing.md),

        // Notes (optional)
        _FeedbackFieldView(
          label: '备注',
          value: feedback!.notes,
        ),
      ],
    );
  }

  // BUG-002: Show disabled state for cancelled courses
  Widget _buildCancelledState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Column(
        children: [
          const Icon(
            Icons.cancel_outlined,
            size: AppSpacing.iconXl,
            color: AppColors.textHint,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            '该课程已取消',
            style: AppTypography.body.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            '已取消的课程无法填写反馈',
            style: AppTypography.bodySmall.copyWith(color: AppColors.textHint),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Column(
        children: [
          Icon(
            Icons.edit_note_outlined,
            size: AppSpacing.iconXl,
            color: AppColors.textHint,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            '本节课还没有反馈',
            style: AppTypography.body.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            '填写后家长即可看到',
            style: AppTypography.bodySmall
                .copyWith(color: AppColors.textHint),
          ),
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              key: const ValueKey('writeFeedbackBtn'),
              onPressed: onEdit,
              child: const Text('填写反馈'),
            ),
          ),
        ],
      ),
    );
  }

  // ── Edit mode ──────────────────────────────────────

  Widget _buildEditMode() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Content field (required)
        _FeedbackFieldEdit(
          label: '课堂内容',
          controller: contentController,
          isRequired: true,
          errorText: contentError,
          onChanged: onContentChanged,
        ),
        const SizedBox(height: AppSpacing.md),

        // Homework field (optional)
        _FeedbackFieldEdit(
          label: '作业',
          controller: homeworkController,
        ),
        const SizedBox(height: AppSpacing.md),

        // Notes field (optional)
        _FeedbackFieldEdit(
          label: '备注',
          controller: notesController,
        ),
        const SizedBox(height: AppSpacing.xl),

        // ── Action buttons ────────────────────────
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                key: const ValueKey('feedbackCancelBtn'),
                onPressed: isSubmitting ? null : onCancel,
                child: const Text('取消'),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: ElevatedButton(
                key: const ValueKey('feedbackSubmitBtn'),
                onPressed: isSubmitting ? null : onSubmit,
                child: isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.textWhite,
                        ),
                      )
                    : Text(feedback != null ? '保存修改' : '提交反馈'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════
// _FeedbackFieldView — 反馈字段查看模式
// ══════════════════════════════════════════════════════════

class _FeedbackFieldView extends StatelessWidget {
  final String label;
  final String? value;
  final bool isRequired;

  const _FeedbackFieldView({
    required this.label,
    required this.value,
    this.isRequired = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label,
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (isRequired)
              Text(
                ' *',
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          value?.isNotEmpty == true ? value! : '—',
          style: AppTypography.body.copyWith(
            color: value?.isNotEmpty == true
                ? AppColors.textPrimary
                : AppColors.textHint,
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════
// _FeedbackFieldEdit — 反馈字段编辑模式
// ══════════════════════════════════════════════════════════

class _FeedbackFieldEdit extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final bool isRequired;
  final String? errorText;
  final ValueChanged<String>? onChanged;

  const _FeedbackFieldEdit({
    required this.label,
    required this.controller,
    this.isRequired = false,
    this.errorText,
    this.onChanged,
  });

  // BUG-006: Align placeholder text with PRD 9.4.4 specs.
  // PRD requires: "请输入课堂内容..." / "请输入课后作业..." / "请输入备注..."
  String get _hintText {
    if (!isRequired) {
      switch (label) {
        case '作业':
          return '请输入课后作业...';
        case '备注':
          return '请输入备注...';
        default:
          return '请输入$label...';
      }
    }
    return '请输入$label...';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label,
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (isRequired)
              Text(
                ' *',
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        TextField(
          controller: controller,
          onChanged: onChanged,
          maxLines: 4,
          minLines: 3,
          decoration: InputDecoration(
            hintText: _hintText,
            errorText: errorText,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.inputPaddingH,
              vertical: AppSpacing.md,
            ),
          ),
        ),
      ],
    );
  }
}
