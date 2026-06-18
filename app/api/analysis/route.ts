import { NextResponse } from 'next/server';
import { analyzeAttendanceWithAI } from '../../../lib/ai';

export async function POST(request: Request) {
  try {
    const { className, students, attendance } = await request.json();

    if (!students || !attendance) {
      return NextResponse.json(
        { error: 'Data murid atau data kehadiran tidak lengkap.' },
        { status: 400 }
      );
    }

    // Format data for AI analysis input
    const formattedStudents = students.map((s: any) => ({
      nis: s.nis,
      name: s.name,
      parentName: s.parentName,
    }));

    const formattedAttendance = attendance.map((att: any) => {
      const student = students.find((s: any) => s.id === att.studentId);
      return {
        date: att.date,
        namaSiswa: student ? student.name : 'Unknown',
        nis: student ? student.nis : '-',
        status: att.status,
      };
    });

    // Invoke the reusable server-side AI service
    const markdownResult = await analyzeAttendanceWithAI({
      className,
      students: formattedStudents,
      attendance: formattedAttendance,
    });

    return NextResponse.json({ result: markdownResult });
  } catch (error: any) {
    console.error('Error in API analysis route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
