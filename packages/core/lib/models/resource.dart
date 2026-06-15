/// Data model for resources returned by the API.
///
/// Maps backend ResourceOut / ResourceDetail schemas:
///   GET /api/v1/resources (list)
///   GET /api/v1/resources/{id} (detail, adds signed_pdf_url)
///
/// See backend/app/schemas/resource.py.

class Resource {
  final String id;
  final String title;
  final String category; // phonics | word_card | recommended
  final String? pdfUrl;
  final int sortOrder;
  final bool isActive;
  final String createdAt;
  final String updatedAt;

  const Resource({
    required this.id,
    required this.title,
    required this.category,
    this.pdfUrl,
    this.sortOrder = 0,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Resource.fromJson(Map<String, dynamic> json) => Resource(
        id: json['id'] as String,
        title: json['title'] as String,
        category: json['category'] as String,
        pdfUrl: json['pdf_url'] as String?,
        sortOrder: json['sort_order'] as int? ?? 0,
        isActive: json['is_active'] as bool? ?? true,
        createdAt: json['created_at'] as String? ?? '',
        updatedAt: json['updated_at'] as String? ?? '',
      );

  /// Chinese label for the category.
  String get categoryLabel {
    switch (category) {
      case 'phonics':
        return '自然拼读';
      case 'word_card':
        return '单词卡';
      case 'recommended':
        return '推荐资源';
      default:
        return category;
    }
  }

  /// Whether this resource has a PDF available for preview.
  bool get canPreview => pdfUrl != null && pdfUrl!.isNotEmpty;
}

/// Resource detail with signed PDF URL (from GET /resources/{id}).
class ResourceDetail extends Resource {
  final String? signedPdfUrl;

  const ResourceDetail({
    required super.id,
    required super.title,
    required super.category,
    super.pdfUrl,
    super.sortOrder,
    super.isActive,
    required super.createdAt,
    required super.updatedAt,
    this.signedPdfUrl,
  });

  factory ResourceDetail.fromJson(Map<String, dynamic> json) =>
      ResourceDetail(
        id: json['id'] as String,
        title: json['title'] as String,
        category: json['category'] as String,
        pdfUrl: json['pdf_url'] as String?,
        sortOrder: json['sort_order'] as int? ?? 0,
        isActive: json['is_active'] as bool? ?? true,
        createdAt: json['created_at'] as String? ?? '',
        updatedAt: json['updated_at'] as String? ?? '',
        signedPdfUrl: json['signed_pdf_url'] as String?,
      );
}

/// Paginated response for resource list.
class PaginatedResources {
  final List<Resource> items;
  final int total;
  final int page;
  final int pageSize;

  const PaginatedResources({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  factory PaginatedResources.fromJson(Map<String, dynamic> json) =>
      PaginatedResources(
        items: (json['items'] as List)
            .map((e) => Resource.fromJson(e as Map<String, dynamic>))
            .toList(),
        total: json['total'] as int? ?? 0,
        page: json['page'] as int? ?? 1,
        pageSize: json['page_size'] as int? ?? 20,
      );
}
