/// Fixed test data for teacher integration tests.
class TestData {
  static const teacherId = 't-001';
  static const pendingCourseId = 't-pending-001';
  static const completedCourseId = 't-completed-001';
  static const allCourseId = 't-all-001';
  static const feedbackId = 't-fb-001';
  static const childId1 = 'child-001';
  static const childId2 = 'child-002';

  // ── Today Courses (2 items: 1 pending + 1 completed) ──
  static final todayCoursesJson = [
    {
      'id': pendingCourseId,
      'date': '2026-06-16',
      'start_time': '14:00:00',
      'end_time': '14:30:00',
      'teacher_id': teacherId,
      'teacher': {'id': teacherId, 'name': '王老师'},
      'meeting_link': 'wemeet://meeting.example.com/123456',
      'status': 'pending',
      'children': [
        {'id': childId1, 'name': '小明'},
      ],
      'created_at': '2026-06-15T10:00:00Z',
      'updated_at': '2026-06-15T10:00:00Z',
    },
    {
      'id': completedCourseId,
      'date': '2026-06-16',
      'start_time': '10:00:00',
      'end_time': '10:30:00',
      'teacher_id': teacherId,
      'teacher': {'id': teacherId, 'name': '李老师'},
      'meeting_link': null,
      'status': 'completed',
      'children': [
        {'id': childId2, 'name': '小红'},
      ],
      'created_at': '2026-06-14T10:00:00Z',
      'updated_at': '2026-06-16T11:00:00Z',
    },
  ];

  // ── Empty today courses ──
  static final emptyTodayCoursesJson = [];

  // ── All Courses (PaginatedCourses, 2 completed items) ──
  static final allCoursesJson = {
    'items': [
      {
        'id': completedCourseId,
        'date': '2026-06-16',
        'start_time': '10:00:00',
        'end_time': '10:30:00',
        'teacher_id': teacherId,
        'teacher': {'id': teacherId, 'name': '李老师'},
        'meeting_link': null,
        'status': 'completed',
        'children': [
          {'id': childId2, 'name': '小红'},
        ],
        'created_at': '2026-06-14T10:00:00Z',
        'updated_at': '2026-06-16T11:00:00Z',
      },
      {
        'id': allCourseId,
        'date': '2026-06-09',
        'start_time': '15:00:00',
        'end_time': '15:30:00',
        'teacher_id': teacherId,
        'teacher': {'id': teacherId, 'name': '张老师'},
        'meeting_link': null,
        'status': 'completed',
        'children': [
          {'id': childId1, 'name': '小明'},
        ],
        'created_at': '2026-06-08T10:00:00Z',
        'updated_at': '2026-06-09T16:00:00Z',
      },
    ],
    'total': 2,
    'page': 1,
    'page_size': 20,
  };

  // ── Course Detail ──
  static Map<String, dynamic> courseDetailJson(String courseId) {
    if (courseId == pendingCourseId) {
      // Pending, no feedback → defaults to edit mode
      return {
        'id': courseId,
        'date': '2026-06-16',
        'start_time': '14:00:00',
        'end_time': '14:30:00',
        'teacher_id': teacherId,
        'teacher': {'id': teacherId, 'name': '王老师'},
        'meeting_link': 'wemeet://meeting.example.com/123456',
        'status': 'pending',
        'children': [
          {'id': childId1, 'name': '小明'},
        ],
        'created_at': '2026-06-15T10:00:00Z',
        'updated_at': '2026-06-15T10:00:00Z',
        'feedback': null,
      };
    }
    // Default: completed with feedback (view mode)
    return {
      'id': courseId,
      'date': '2026-06-16',
      'start_time': '10:00:00',
      'end_time': '10:30:00',
      'teacher_id': teacherId,
      'teacher': {'id': teacherId, 'name': '李老师'},
      'meeting_link': null,
      'status': 'completed',
      'children': [
        {'id': childId2, 'name': '小红'},
      ],
      'created_at': '2026-06-14T10:00:00Z',
      'updated_at': '2026-06-16T11:00:00Z',
      'feedback': {
        'id': feedbackId,
        'content': '今天学习了自然拼读法，小红表现出色。',
        'homework': '完成练习册第3页。',
        'notes': '进步很大，继续保持。',
        'created_by': teacherId,
        'created_at': '2026-06-16T10:35:00Z',
        'updated_at': '2026-06-16T10:35:00Z',
      },
    };
  }

  // ── Feedback submit response ──
  static final feedbackSubmitResponseJson = {'success': true};

  // ── Display helpers ──
  static const childName1 = '小明';
  static const childName2 = '小红';
  static const pendingStatusText = '待反馈';
  static const completedStatusText = '已完成';
  static const teacherName = '王老师';
}
