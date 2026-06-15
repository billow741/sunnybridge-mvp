/// Data model for reading progress records.
///
/// Maps backend ProgressOut schema:
///   GET /reading/progress (parent only)
///
/// See backend/app/schemas/reading.py.

class ReadingProgress {
  final String id;
  final String materialId;
  final String childId;
  final int currentPage;
  final bool completed;
  final String lastReadAt;

  const ReadingProgress({
    required this.id,
    required this.materialId,
    required this.childId,
    this.currentPage = 1,
    this.completed = false,
    required this.lastReadAt,
  });

  factory ReadingProgress.fromJson(Map<String, dynamic> json) =>
      ReadingProgress(
        id: json['id'] as String,
        materialId: json['material_id'] as String,
        childId: json['child_id'] as String,
        currentPage: json['current_page'] as int? ?? 1,
        completed: json['completed'] as bool? ?? false,
        lastReadAt: json['last_read_at'] as String? ?? '',
      );
}