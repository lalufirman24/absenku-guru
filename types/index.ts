export interface UserProfile {
  uid: string;
  name: string;
  schoolName: string;
  email: string;
  plan: 'free' | 'premium';
  createdAt: string;
}

export interface ClassRoom {
  id?: string;
  teacherId: string;
  name: string;
  grade: string;
  createdAt: string;
}

export interface Student {
  id?: string;
  teacherId: string;
  classId: string;
  nis: string;
  name: string;
  parentName: string;
  parentPhone: string;
  createdAt: string;
}

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';

export interface Attendance {
  id?: string;
  studentId: string;
  classId: string;
  teacherId: string;
  date: string; // YYYY-MM-DD format
  status: AttendanceStatus;
}
