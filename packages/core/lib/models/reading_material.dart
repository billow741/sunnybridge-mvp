/// Data model for reading materials returned by the API.
///
/// Maps backend MaterialOut / MaterialDetail schemas:
///   GET /reading/materials (list)
///   GET /reading/materials/{id} (detail)
///
/// See backend/app/schemas/reading.py.

class ReadingMaterial {
  final String id;
  final String title;
  final String level; // L1-L6
  final String category; // picture_book | short_text | story | read_aloud
  final String? coverUrl;
  final String? pdfUrl;
  final int pageCount;
  final int sortOrder;
  final bool isActive;
  final String createdAt;
  final String updatedAt;

  const ReadingMaterial({
    required this.id,
    required this.title,
    required this.level,
    required this.category,
    this.coverUrl,
    this.pdfUrl,
    this.pageCount = 0,
    this.sortOrder = 0,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ReadingMaterial.fromJson(Map<String, dynamic> json) =>
      ReadingMaterial(
        id: json['id'] as String,
        title: json['title'] as String,
        level: json['level'] as String,
        category: json['category'] as String,
        coverUrl: json['cover_url'] as String?,
        pdfUrl: json['pdf_url'] as String?,
        pageCount: json['page_count'] as int? ?? 0,
        sortOrder: json['sort_order'] as int? ?? 0,
        isActive: json['is_active'] as bool? ?? true,
        createdAt: json['created_at'] as String? ?? '',
        updatedAt: json['updated_at'] as String? ?? '',
      );

  /// Chinese label for the category.
  String get categoryLabel {
    switch (category) {
      case 'picture_book':
        return '绘本';
      case 'short_text':
        return '短文';
      case 'story':
        return '故事';
      case 'read_aloud':
        return '跟读';
      default:
        return category;
    }
  }
}

/// Paginated response for reading material list.
class PaginatedMaterials {
  final List<ReadingMaterial> items;
  final int total;
  final int page;
  final int pageSize;

  const PaginatedMaterials({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  factory PaginatedMaterials.fromJson(Map<String, dynamic> json) =>
      PaginatedMaterials(
        items: (json['items'] as List)
            .map((e) => ReadingMaterial.fromJson(e as Map<String, dynamic>))
            .toList(),
        total: json['total'] as int? ?? 0,
        page: json['page'] as int? ?? 1,
        pageSize: json['page_size'] as int? ?? 20,
      );
}