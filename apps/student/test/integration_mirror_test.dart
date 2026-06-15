// Widget-test mirror of integration tests.
// Enables `flutter test` (no desktop build required) to verify the same
// scenarios.  The integration_test/ directory holds the canonical versions
// for `flutter test integration_test` (requires native build env).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/test_app.dart';

void main() {
  group('Course Flow Widget Tests (mirrors integration_test)', () {
    testWidgets(
      'Use Case 1: Course home page renders with today/history tabs and course cards',
      (tester) async {
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle(const Duration(seconds: 3));

        expect(find.text('课程'), findsOneWidget);
        expect(find.text('今日课程'), findsOneWidget);
        expect(find.text('历史课程'), findsOneWidget);
        expect(find.text(TestData.childName), findsWidgets);
        expect(find.text('待上课'), findsOneWidget);
        expect(find.text('已完成'), findsOneWidget);
      },
    );

    testWidgets(
      'Use Case 2: Tapping a course card navigates to course detail page',
      (tester) async {
        await tester.pumpWidget(createTestApp());
        await tester.pumpAndSettle(const Duration(seconds: 3));

        final pendingCardFinder =
            find.byKey(ValueKey('courseCard_${TestData.pendingCourseId}'));
        expect(pendingCardFinder, findsOneWidget);

        await tester.tap(pendingCardFinder);
        await tester.pumpAndSettle(const Duration(seconds: 3));

        expect(find.text('课程详情'), findsOneWidget);
        expect(
          find.byWidgetPredicate(
            (w) => w is Text && w.data?.contains(TestData.teacherName) == true,
          ),
          findsOneWidget,
        );
        expect(find.text('待上课'), findsOneWidget);
        expect(
          find.byWidgetPredicate(
            (w) => w is Text && w.data?.contains('6月') == true,
          ),
          findsWidgets,
        );
        expect(find.text('课程反馈'), findsOneWidget);
        expect(find.text('课堂内容'), findsOneWidget);
      },
    );

    testWidgets(
      'Use Case 3: Course detail join meeting button exists and can be tapped',
      (tester) async {
        final cleanup = setupUrlLauncherMock();
        try {
          await tester.pumpWidget(createTestApp(
            initialLocation: '/course/${TestData.pendingCourseId}',
          ));
          await tester.pumpAndSettle(const Duration(seconds: 3));

          final joinButtonFinder = find.byKey(const ValueKey('joinMeetingBtn'));
          expect(joinButtonFinder, findsOneWidget);

          final joinButton = tester.widget<ElevatedButton>(joinButtonFinder);
          expect(joinButton.enabled, isTrue);

          await tester.tap(joinButtonFinder);
          await tester.pumpAndSettle();

          expect(find.text('课程详情'), findsOneWidget);
        } finally {
          cleanup();
        }
      },
    );
  });

  group('Profile Flow Widget Tests (mirrors integration_test)', () {
    testWidgets(
      'Use Case 4: Profile page renders with child info',
      (tester) async {
        await tester.pumpWidget(createTestApp(
          initialLocation: '/profile',
        ));
        await tester.pumpAndSettle(const Duration(seconds: 3));

        expect(find.text('我的'), findsOneWidget);
        expect(find.text(TestData.childName), findsWidgets);
        expect(find.text(TestData.childEnglishName), findsWidgets);
        expect(find.text(TestData.childLevel), findsWidgets);
        expect(find.text('姓名'), findsOneWidget);
        expect(find.text('英文名'), findsOneWidget);
        expect(find.text('级别'), findsOneWidget);
        expect(find.text('退出登录'), findsOneWidget);
      },
    );
  });
}
