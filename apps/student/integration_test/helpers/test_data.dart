/// Fixed test data for integration tests.
///
/// All data mimics the real API response format so the UI renders
/// realistically. Field names match the backend snake_case JSON
/// (before fromJson conversion).
class TestData {
  // ── IDs ──────────────────────────────────────────────
  static const pendingCourseId = 'c-pending-001';
  static const completedCourseId = 'c-completed-001';
  static const historyCourseId = 'c-history-001';
  static const teacherId = 't-001';
  static const childId = 'child-001';
  static const parentId = 'p-001';
  static const feedbackId = 'fb-001';

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
        {'id': childId, 'name': '小明'},
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
        {'id': childId, 'name': '小明'},
      ],
      'created_at': '2026-06-14T10:00:00Z',
      'updated_at': '2026-06-16T11:00:00Z',
    },
  ];

  // ── History Courses (1 item, paginated) ──
  static final historyCoursesJson = {
    'items': [
      {
        'id': historyCourseId,
        'date': '2026-06-10',
        'start_time': '14:00:00',
        'end_time': '14:30:00',
        'teacher_id': teacherId,
        'teacher': {'id': teacherId, 'name': '张老师'},
        'meeting_link': null,
        'status': 'completed',
        'children': [
          {'id': childId, 'name': '小明'},
        ],
        'created_at': '2026-06-09T10:00:00Z',
        'updated_at': '2026-06-10T15:00:00Z',
      },
    ],
    'total': 1,
    'page': 1,
    'page_size': 20,
  };

  // ── Course Detail (pending + meetingLink + feedback) ──
  static Map<String, dynamic> courseDetailJson(String courseId) {
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
        {'id': childId, 'name': '小明'},
      ],
      'created_at': '2026-06-15T10:00:00Z',
      'updated_at': '2026-06-15T10:00:00Z',
      'feedback': {
        'id': feedbackId,
        'content': '今天学习了自然拼读法，小明表现很好，积极参与课堂活动。',
        'homework': '完成练习册第5页的拼读练习。',
        'notes': '小明对新单词掌握不错，建议多练习口语表达。',
        'created_by': teacherId,
        'created_at': '2026-06-16T14:35:00Z',
        'updated_at': '2026-06-16T14:35:00Z',
      },
    };
  }

  // ── Child Profile ──
  static final childProfileJson = {
    'id': childId,
    'name': '小明',
    'english_name': 'Tom',
    'birth_date': '2019-03-15',
    'level': 'L3',
    'parent_id': parentId,
    'created_at': '2026-01-01T00:00:00Z',
    'updated_at': '2026-06-15T10:00:00Z',
  };

  // ── Display helpers ──
  static const childName = '小明';
  static const childEnglishName = 'Tom';
  static const childLevel = 'L3';
  static const teacherName = '王老师';
  static const pendingCourseDate = '2026-06-16';
}
