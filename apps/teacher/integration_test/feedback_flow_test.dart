import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/test_app.dart';

void main() {
  group('Feedback Flow Tests', () {
    // ── Use Case 4: Feedback entry interaction ──
    testWidgets(
        'Course detail feedback section is interactive (FLUTTER-11)',
        (tester) async {
      await tester.pumpWidget(createTestApp());
      await tester.pumpAndSettle();

      // Navigate to a completed course detail (has feedback, view mode)
      await tester.tap(find.text('全部课程'));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(
          ValueKey('teacherCourseCard_${TestData.completedCourseId}')));
      await tester.pumpAndSettle();

      // Verify in view mode: feedback section with '编辑' button
      expect(find.text('课后反馈'), findsOneWidget);
      expect(find.byKey(ValueKey('feedbackEditBtn')), findsOneWidget);

      // Tap '编辑' to enter edit mode
      await tester.tap(find.byKey(ValueKey('feedbackEditBtn')));
      await tester.pumpAndSettle();

      // Verify edit mode: TextField and action buttons appear
      expect(
        find.byWidgetPredicate((w) =>
            w is TextField &&
            w.decoration?.hintText?.contains('课堂内容') == true),
        findsOneWidget,
      );

      expect(find.byKey(ValueKey('feedbackCancelBtn')), findsOneWidget);
      expect(find.byKey(ValueKey('feedbackSubmitBtn')), findsOneWidget);
    });
  });
}
