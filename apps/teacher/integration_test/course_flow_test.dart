import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/test_app.dart';

void main() {
  group('Course Flow Tests', () {
    // ── Use Case 1: T-TODAY page renders ──
    testWidgets('T-TODAY page renders successfully (FLUTTER-09)',
        (tester) async {
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // AppBar title
      expect(find.text('课程'), findsOneWidget);

      // Tab labels
      expect(find.text('今日课程'), findsWidgets);
      expect(find.text('全部课程'), findsWidgets);

      // At least one course card exists (pending course card has key)
      expect(
        find.byKey(ValueKey('teacherCourseCard_${TestData.pendingCourseId}')),
        findsOneWidget,
      );

      // Status chip visible
      expect(find.text(TestData.pendingStatusText), findsWidgets);
    });

    // ── Use Case 2: T-TODAY → T-TODAY-DETAIL ──
    testWidgets('Navigate from T-TODAY to T-TODAY-DETAIL (FLUTTER-10)',
        (tester) async {
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Tap first course card
      await tester.tap(
          find.byKey(ValueKey('teacherCourseCard_${TestData.pendingCourseId}')));
      await tester.pumpAndSettle();

      // Detail page AppBar
      expect(find.text('课程详情'), findsOneWidget);

      // Student info visible
      expect(find.text('小明'), findsWidgets);

      // Meeting link button visible (pending course has meeting_link)
      expect(find.text('进入腾讯会议'), findsOneWidget);
    });

    // ── Use Case 3: T-ALL → T-ALL-DETAIL ──
    testWidgets('Navigate from T-ALL to T-ALL-DETAIL (FLUTTER-10)',
        (tester) async {
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Switch to '全部课程' tab
      await tester.tap(find.text('全部课程'));
      await tester.pumpAndSettle();

      // Tap a completed course card
      await tester.tap(find.byKey(
          ValueKey('teacherCourseCard_${TestData.completedCourseId}')));
      await tester.pumpAndSettle();

      // Detail page AppBar
      expect(find.text('课程详情'), findsOneWidget);

      // Completed status visible
      expect(find.text(TestData.completedStatusText), findsWidgets);

      // Feedback section header visible
      expect(find.text('课后反馈'), findsOneWidget);
    });

    // ── Use Case 5: Empty T-TODAY state ──
    testWidgets('Empty T-TODAY shows empty state (FLUTTER-09)',
        (tester) async {
      // Configure mock to return empty array
      mockInterceptor.todayEmpty = true;

      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Empty state text
      expect(find.text('今日暂无课程'), findsOneWidget);

      // Reset
      mockInterceptor.todayEmpty = false;
    });
  });
}
