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

  // ── Level colors (L1-L6) ─────────────────────
  static const levelColors = [
    Color(0xFF4ECDC4), // L1 — Teal
    Color(0xFF45B7D1), // L2 — Sky
    Color(0xFF5B8DEF), // L3 — Periwinkle
    Color(0xFF7C5CFC), // L4 — Violet
    Color(0xFFF06292), // L5 — Pink
    Color(0xFFFF7043), // L6 — Deep Orange
  ];

  /// Get color for reading level L1-L6.
  static Color levelColor(String level) {
    final idx = int.tryParse(level.replaceFirst('L', '')) ?? 1;
    return levelColors[(idx - 1).clamp(0, levelColors.length - 1)];
  }
}
