class Assignment {
  final String assignmentId;
  final String assignmentName;
  final String description;
  final String dueDate;
  final String startDate;
  final bool isSubmitted;
  final String? submissionDate;
  final int maxMarks;
  final String courseName;

  Assignment({
    required this.assignmentId,
    required this.assignmentName,
    required this.description,
    required this.dueDate,
    required this.startDate,
    required this.isSubmitted,
    this.submissionDate,
    required this.maxMarks,
    required this.courseName,
  });

  factory Assignment.fromJson(Map<String, dynamic> json) {
    return Assignment(
      assignmentId: json['assignment_id']?.toString() ?? '',
      assignmentName: json['assignment_name'] ?? 'Untitled assignment',
      description: json['description'] ?? '',
      dueDate: json['due_date'] ?? '',
      startDate: json['start_date'] ?? '',
      isSubmitted: json['is_submitted'] ?? false,
      submissionDate: json['submission_date'],
      maxMarks: json['max_marks'] ?? 0,
      courseName: json['course_name'] ?? 'Unknown course',
    );
  }

  /// Parses the due_date string into a DateTime, or null if unparseable.
  /// Backend sends dates like "2026-08-24 10:00:00" or similar formats.
  DateTime? get dueDateTime {
    if (dueDate.isEmpty) return null;
    try {
      return DateTime.parse(dueDate.replaceFirst(' ', 'T'));
    } catch (_) {
      return null;
    }
  }
}