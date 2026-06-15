/// Data models for course responses.
///
/// Maps backend CourseOut / CourseDetail / PaginatedCourses schemas
/// (see backend/app/schemas/course.py).

// ── Brief nested models ────────────────────────────

class ChildBrief {
  final String id;
  final String name;

  const ChildBrief({required this.id, required this.name});

  factory ChildBrief.fromJson(Map<String, dynamic> json) => ChildBrief(
        id: json['id'] as String,
        name: json['name'] as String,
      );
}

class TeacherBrief {
  final String id;
  final String name;

  const TeacherBrief({required this.id, required this.name});

  factory TeacherBrief.fromJson(Map<String, dynamic> json) => TeacherBrief(
        id: json['id'] as String,
        name: json['name'] as String,
      );
}

// ── FeedbackBrief (used in course detail) ───────────

class FeedbackBrief {
  final String id;
  final String content;
  final String? homework;
  final String? notes;
  final String createdBy;
  final String createdAt;
  final String updatedAt;

  const FeedbackBrief({
    required this.id,
    required this.content,
    this.homework,
    this.notes,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FeedbackBrief.fromJson(Map<String, dynamic> json) => FeedbackBrief(
        id: json['id'] as String,
        content: json['content'] as String,
        homework: json['homework'] as String?,
        notes: json['notes'] as String?,
        createdBy: json['created_by'] as String,
        createdAt: json['created_at'] as String? ?? '',
        updatedAt: json['updated_at'] as String? ?? '',
      );
}

// ── CourseItem (list view) ────────────────────────

class CourseItem {
  final String id;
  final String date; // ISO date string "2026-06-04"
  final String startTime; // "HH:MM:SS" or "HH:MM"
  final String endTime;
  final String teacherId;
  final TeacherBrief? teacher;
  final String? meetingLink;
  final String status; // pending | completed | cancelled
  final List<ChildBrief> children;
  final String createdAt;
  final String updatedAt;

  const CourseItem({
    required this.id,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.teacherId,
    this.teacher,
    this.meetingLink,
    required this.status,
    this.children = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory CourseItem.fromJson(Map<String, dynamic> json) => CourseItem(
        id: json['id'] as String,
        date: json['date'] as String,
        startTime: json['start_time'] as String,
        endTime: json['end_time'] as String,
        teacherId: json['teacher_id'] as String,
        teacher: json['teacher'] != null
            ? TeacherBrief.fromJson(json['teacher'] as Map<String, dynamic>)
            : null,
        meetingLink: json['meeting_link'] as String?,
        status: json['status'] as String? ?? 'pending',
        children: json['children'] != null
            ? (json['children'] as List)
                .map((e) => ChildBrief.fromJson(e as Map<String, dynamic>))
                .toList()
            : [],
        createdAt: json['created_at'] as String? ?? '',
        updatedAt: json['updated_at'] as String? ?? '',
      );

  String get timeRange {
    final start = _formatTime(startTime);
    final end = _formatTime(endTime);
    return '$start-$end';
  }

  String get childrenNames =>
      children.map((c) => c.name).join('、');

  String get teacherDisplayName => teacher?.name ?? '教师';

  static String _formatTime(String t) {
    if (t.length >= 5) return t.substring(0, 5);
    return t;
  }
}

// ── PaginatedCourses ────────────────────────────────

class PaginatedCourses {
  final List<CourseItem> items;
  final int total;
  final int page;
  final int pageSize;

  const PaginatedCourses({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  factory PaginatedCourses.fromJson(Map<String, dynamic> json) =>
      PaginatedCourses(
        items: (json['items'] as List)
            .map((e) => CourseItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        total: json['total'] as int? ?? 0,
        page: json['page'] as int? ?? 1,
        pageSize: json['page_size'] as int? ?? 20,
      );

  bool get hasMore => page * pageSize < total;
}

// ── CourseDetailItem (course + feedback) ───────────

class CourseDetailItem {
  final CourseItem course;
  final FeedbackBrief? feedback;

  const CourseDetailItem({
    required this.course,
    this.feedback,
  });

  factory CourseDetailItem.fromJson(Map<String, dynamic> json) {
    return CourseDetailItem(
      course: CourseItem.fromJson(json),
      feedback: json['feedback'] != null
          ? FeedbackBrief.fromJson(json['feedback'] as Map<String, dynamic>)
          : null,
    );
  }
}
