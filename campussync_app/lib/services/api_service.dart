import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/assignment.dart';
import '../models/course.dart';
import '../models/group.dart';

/// Central place for every call to the CampusSync FastAPI backend.
/// Screens should never call http directly — always go through here.
class ApiService {
  // While testing on a physical phone/emulator, 127.0.0.1 refers to the
  // DEVICE itself, not your laptop. Use your laptop's LAN IP instead
  // (e.g. "http://192.168.1.5:8000"), or 10.0.2.2 for the Android emulator.
  static const String baseUrl = "http://127.0.0.1:8000";

  /// Logs into VOLP via the backend. Returns a map with user_id + courses
  /// on success, or throws an ApiException with the server's error message.
  static Future<Map<String, dynamic>> login({
    required String username,
    required String password,
    required String fcmToken,
    required String whatsappNumber,
  }) async {
    final response = await http.post(
      Uri.parse("$baseUrl/auth/login"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "username": username,
        "password": password,
        "fcm_token": fcmToken,
        "whatsapp_number": whatsappNumber,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 200) {
      return data;
    } else {
      throw ApiException(data["detail"] ?? "Login failed");
    }
  }

  /// Fetches all assignments for a user, already sorted by due date
  /// (the backend does the sorting).
  static Future<List<Assignment>> getAssignments(int userId) async {
    final response = await http.get(Uri.parse("$baseUrl/assignments/$userId"));

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List assignmentsJson = data["assignments"];
      return assignmentsJson.map((a) => Assignment.fromJson(a)).toList();
    } else {
      throw ApiException("Failed to load assignments");
    }
  }

  /// Fetches all courses for a user.
  static Future<List<Course>> getCourses(int userId) async {
    final response = await http.get(Uri.parse("$baseUrl/courses/$userId"));

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List coursesJson = data["courses"];
      return coursesJson.map((c) => Course.fromJson(c)).toList();
    } else {
      throw ApiException("Failed to load courses");
    }
  }

  /// Creates a new study group for a course. The creator auto-joins.
  static Future<CourseGroup> createGroup({
    required int userId,
    required int crsid,
    required int colid,
  }) async {
    final response = await http.post(
      Uri.parse("$baseUrl/groups/create"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"user_id": userId, "crsid": crsid, "colid": colid}),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 200) {
      return CourseGroup.fromJson(data["group"]);
    } else {
      throw ApiException(data["detail"] ?? "Failed to create group");
    }
  }

  /// Joins an existing group via its invite code.
  static Future<CourseGroup> joinGroup({
    required int userId,
    required String inviteCode,
  }) async {
    final response = await http.post(
      Uri.parse("$baseUrl/groups/join"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"user_id": userId, "invite_code": inviteCode}),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 200) {
      return CourseGroup.fromJson(data["group"]);
    } else {
      throw ApiException(data["detail"] ?? "Failed to join group");
    }
  }

  /// Gets submission status for every member of a group, for one assignment.
  static Future<List<MemberStatus>> getGroupStatus({
    required int groupId,
    required String assignmentId,
  }) async {
    final response = await http.get(
      Uri.parse("$baseUrl/groups/$groupId/status/$assignmentId"),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List membersJson = data["members"];
      return membersJson.map((m) => MemberStatus.fromJson(m)).toList();
    } else {
      throw ApiException("Failed to load group status");
    }
  }

  /// Updates notification preferences.
  static Future<void> updateSettings({
    required int userId,
    required bool whatsappEnabled,
    required bool pushEnabled,
    required int reminderMinutes,
  }) async {
    final response = await http.put(
      Uri.parse("$baseUrl/settings/$userId"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "user_id": userId,
        "whatsapp_enabled": whatsappEnabled,
        "push_enabled": pushEnabled,
        "reminder_minutes": reminderMinutes,
      }),
    );

    if (response.statusCode != 200) {
      throw ApiException("Failed to update settings");
    }
  }
}

/// Thrown whenever the backend returns an error response.
/// Catch this in your screens to show a friendly message to the user.
class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}