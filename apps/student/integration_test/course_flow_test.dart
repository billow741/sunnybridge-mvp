import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/test_app.dart';

// ═══════════════════════════════════════════════════════════════════════
// FLUTTER-02 / FLUTTER-03 / FLUTTER-04 — Course flow integration tests
// ═══════════════════════════════════════════════════════════════════════

void main() {
  group('Course Flow Integration Tests', () {
    // ── Use Case 1: Course home page renders ──────────────────────
    testWidgets(
      'Use Case 1: Course home page renders with today/history tabs and course cards',
      (tester) async {
        await tester.pumpWidget(createTestApp());
        // Allow async operations (API mock, state build)
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // ── Verify: AppBar title '课程' exists ──
        expect(find.text('课程'), findsOneWidget);

        // ── Verify: Two tab labels exist ──
        expect(find.text('今日课程'), findsOneWidget);
        expect(find.text('历史课程'), findsOneWidget);

        // ── Verify: At least one course card is rendered ──
        expect(find.text(TestData.childName), findsWidgets);

        // ── Verify: Course status chips exist ──
        expect(find.text('待上课'), findsOneWidget);
        expect(find.text('已完成'), findsOneWidget);
      },
    );

    // ── Use Case 2: Navigate from course list to course detail ────
    testWidgets(
      'Use Case 2: Tapping a course card navigates to course detail page',
      (tester) async {
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // ── Tap the first course card (pending course) ──
        final pendingCardFinder =
            find.byKey(const ValueKey('courseCard_${TestData.pendingCourseId}'));
        expect(pendingCardFinder, findsOneWidget);

        await tester.tap(pendingCardFinder);
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // ── Verify: Navigated to course detail page ──
        expect(find.text('课程详情'), findsOneWidget);

        // ── Verify: Teacher name displayed ──
        expect(
          find.byWidgetPredicate(
            (w) => w is Text && w.data?.contains(TestData.teacherName) == true,
          ),
          findsOneWidget,
        );
        // Status chip
        expect(find.text('待上课'), findsOneWidget);

        // ── Verify: Date/time info exists (formatted) ──
        // _formatDate('2026-06-16') → "6月16日 周二"
        expect(
          find.byWidgetPredicate(
            (w) => w is Text && w.data?.contains('6月') == true,
          ),
          findsWidgets,
        );

        // ── Verify: Feedback section exists ──
        expect(find.text('课程反馈'), findsOneWidget);
        expect(find.text('课堂内容'), findsOneWidget);
      },
    );

    // ── Use Case 3: Course detail "Join Meeting" button ────────────
    testWidgets(
      'Use Case 3: Course detail join meeting button exists and can be tapped',
      (tester) async {
        // Set up url_launcher mock
        final cleanup = setupUrlLauncherMock();
        try {
          await tester.pumpWidget(createTestApp(
            initialLocation: '/course/${TestData.pendingCourseId}',
          ));
          await tester.pumpAndSettle(const Duration(seconds: 3));

          // ── Verify: "进入课堂" button exists ──
          final joinButtonFinder = find.byKey(const ValueKey('joinMeetingBtn'));
          expect(joinButtonFinder, findsOneWidget);

          // Verify button is enabled
          final joinButton = tester.widget<ElevatedButton>(joinButtonFinder);
          expect(joinButton.enabled, isTrue);

          // ── Tap the button ──
          await tester.tap(joinButtonFinder);
          await tester.pumpAndSettle();

          // No crash — page still rendered
          expect(find.text('课程详情'), findsOneWidget);
        } finally {
          cleanup();
        }
      },
    );
  });
}
