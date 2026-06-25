/// Data model for a single child profile.
///
/// Maps backend ChildOut schema:
///   GET /api/v1/children/me  (parent only)
///   GET /api/v1/children/{id} (admin)
///
/// See backend/app/schemas/child.py.

class ChildProfile {
  final String id;
  final String name;
  final String? englishName;
  final String? birthDate;
  final String level; // CEFR: starter,A1,A2,B1,B2,C1,C2
  final String parentId;
  final String? createdAt;
  final String? updatedAt;

  const ChildProfile({
    required this.id,
    required this.name,
    this.englishName,
    this.birthDate,
    required this.level,
    required this.parentId,
    this.createdAt,
    this.updatedAt,
  });

  factory ChildProfile.fromJson(Map<String, dynamic> json) => ChildProfile(
        id: json['id'] as String,
        name: json['name'] as String,
        englishName: json['english_name'] as String?,
        birthDate: json['birth_date'] as String?,
        level: json['level'] as String? ?? 'starter',
        parentId: json['parent_id'] as String,
        createdAt: json['created_at'] as String?,
        updatedAt: json['updated_at'] as String?,
      );

  /// Whether english name is available.
  bool get hasEnglishName =>
      englishName != null && englishName!.isNotEmpty;

  /// Display string for level (already CEFR from backend, e.g. "starter","A1"..."C2").
  String get levelDisplay => level;

  /// Short birth year display (e.g. "2020年").
  String? get birthYearDisplay {
    if (birthDate == null || birthDate!.isEmpty) return null;
    final year = birthDate!.split('-').first;
    if (year.isNotEmpty) return '$year年';
    return null;
  }
}