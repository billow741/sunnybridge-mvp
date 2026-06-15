import 'package:flutter_test/flutter_test.dart';

import 'helpers/test_app.dart';

// ═══════════════════════════════════════════════════════════════════════
// FLUTTER-05 — Profile flow integration test
// ═══════════════════════════════════════════════════════════════════════

void main() {
  group('Profile Flow Integration Tests', () {
    // ── Use Case 4: Profile page renders with child info ──────────
    testWidgets(
      'Use Case 4: Profile page renders with child info',
      (tester) async {
        await tester.pumpWidget(createTestApp(
          initialLocation: '/profile',
        ));
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // ── Verify: Profile page title ──
        expect(find.text('我的'), findsOneWidget);

        // ── Verify: Child name/englishName/level (appear in header card + info row)
        expect(find.text(TestData.childName), findsWidgets);
        expect(find.text(TestData.childEnglishName), findsWidgets);
        expect(find.text(TestData.childLevel), findsWidgets);

        // ── Verify: Info row labels ──
        expect(find.text('姓名'), findsOneWidget);
        expect(find.text('英文名'), findsOneWidget);
        expect(find.text('级别'), findsOneWidget);

        // ── Verify: Logout button exists ──
        expect(find.text('退出登录'), findsOneWidget);
      },
    );
  });
}
