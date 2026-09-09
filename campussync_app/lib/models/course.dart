class Course {
  final String courseName;
  final String displayName;
  final int crsid;
  final int colid;
  final String instructor;
  final bool isActive;
  final bool isArchived;
  final double progress;
  final int assignmentCount;

  Course({
    required this.courseName,
    required this.displayName,
    required this.crsid,
    required this.colid,
    required this.instructor,
    required this.isActive,
    required this.isArchived,
    required this.progress,
    required this.assignmentCount,
  });

  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      courseName: json['course_name'] ?? '',
      displayName: json['display_name'] ?? json['course_name'] ?? 'Unknown course',
      crsid: json['crsid'] ?? 0,
      colid: json['colid'] ?? 0,
      instructor: json['instructor'] ?? '',
      isActive: json['is_active'] ?? false,
      isArchived: json['is_archived'] ?? false,
      progress: (json['progress'] ?? 0.0).toDouble(),
      assignmentCount: json['asscnt'] ?? 0,
    );
  }
}