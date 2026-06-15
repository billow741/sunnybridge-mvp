/// SunnyBridge Core Library — shared utilities for all app shells.
///
/// Import as: `import 'package:sunnybridge_core/sunnybridge_core.dart';`
library;

// ── API ──────────────────────────────────────────────
export 'api/api_client.dart';
export 'api/auth_interceptor.dart';

// ── Auth ─────────────────────────────────────────────
export 'auth/auth_storage.dart';
export 'auth/auth_storage_base.dart';

// ── Router ───────────────────────────────────────────
export 'router/app_router.dart';

// ── Theme ────────────────────────────────────────────
export 'theme/app_theme.dart';
export 'theme/app_colors.dart';
export 'theme/app_typography.dart';
export 'theme/app_spacing.dart';

// ── Models ───────────────────────────────────────────
export 'models/course_item.dart';
export 'models/reading_material.dart';
export 'models/reading_progress.dart';
export 'models/child_profile.dart';
export 'models/resource.dart';

// ── Widgets ──────────────────────────────────────────
export 'widgets/course_card.dart';
export 'widgets/material_card.dart';
export 'widgets/empty_state.dart';
export 'widgets/loading_indicator.dart';
export 'widgets/error_retry.dart';

// ── Pages ────────────────────────────────────────────
export 'pages/login_page.dart';
export 'pages/course_page.dart';
export 'pages/course_detail_page.dart';
