import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sunnybridge_core/sunnybridge_core.dart';

import '../app.dart';

/// Teacher home page — redirects to /courses.
///
/// This page is kept for backward compatibility; it redirects to the
/// actual TeacherCoursesPage (T-TODAY / T-ALL) which is the teacher
/// home after FLUTTER-10.
class TeacherHomePage extends StatelessWidget {
  final ApiClient apiClient;

  const TeacherHomePage({super.key, required this.apiClient});

  @override
  Widget build(BuildContext context) {
    // Redirect to courses page
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (context.mounted) {
        context.go(TeacherRoutePaths.courses);
      }
    });

    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
