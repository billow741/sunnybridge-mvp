import 'package:flutter/material.dart';

/// SunnyBridge brand color palette.
class AppColors {
  AppColors._();

  // ── Primary ──────────────────────────────────
  static const primary = Color(0xFF4A90D9);      // Main blue
  static const primaryLight = Color(0xFF7AB5E8); // Light variant
  static const primaryDark = Color(0xFF2E6AB0);  // Dark variant

  // ── Accent ───────────────────────────────────
  static const accent = Color(0xFFF5A623);       // Warm orange
  static const accentLight = Color(0xFFFBC573);

  // ── Semantic ─────────────────────────────────
  static const success = Color(0xFF27AE60);
  static const warning = Color(0xFFF2994A);
  static const error = Color(0xFFEB5757);
  static const info = Color(0xFF2D9CDB);

  // ── Neutral ──────────────────────────────────
  static const textPrimary = Color(0xFF2D3436);
  static const textSecondary = Color(0xFF636E72);
  static const textHint = Color(0xFFB2BEC3);
  static const textWhite = Color(0xFFFFFFFF);

  // ── Background ───────────────────────────────
  static const background = Color(0xFFF8F9FA);
  static const backgroundVariant = Color(0xFFE8ECF0);
  static const surface = Color(0xFFFFFFFF);
  static const cardBackground = Color(0xFFFFFFFF);
  static const divider = Color(0xFFE0E0E0);

  // ── Level colors (CEFR) ─────────────────────
  static const levelColors = [
    Color(0xFF4ECDC4), // starter — Teal
    Color(0xFF45B7D1), // A1 — Sky
    Color(0xFF5B8DEF), // A2 — Periwinkle
    Color(0xFF7C5CFC), // B1 — Violet
    Color(0xFFF06292), // B2 — Pink
    Color(0xFFFF7043), // C1 — Deep Orange
    Color(0xFF8B5CF6), // C2 — Purple
  ];

  /// CEFR level order for color mapping.
  static const _cefrOrder = ['starter', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  /// Get color for CEFR level (starter,A1...C2).
  static Color levelColor(String level) {
    final idx = _cefrOrder.indexOf(level);
    return levelColors[(idx >= 0 ? idx : 0).clamp(0, levelColors.length - 1)];
  }
}
