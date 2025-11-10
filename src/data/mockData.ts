/**
 * ClearSkies Mock Data
 *
 * Simple mock data for demonstrating the ClearSkies app capabilities.
 * This data will be used to seed Firestore during development.
 */
import type { FlightBooking, Student } from "./types";

export type StudentSeed = Omit<Student, "createdAt"> & { createdAt: string };

export type FlightBookingSeed = Omit<
  FlightBooking,
  "createdAt" | "lastWeatherCheck"
> & {
  createdAt: string;
  lastWeatherCheck?: string;
};

// ====================================
// Mock Students
// ====================================
export const mockStudents: StudentSeed[] = [
  {
    id: "student-001",
    name: "Sarah Mitchell",
    email: "sarah.mitchell@example.com",
    phone: "(650) 555-0101",
    role: "student",
    trainingLevel: "student",
    createdAt: "2025-10-01T08:00:00Z",
  },
  {
    id: "student-002",
    name: "James Rodriguez",
    email: "james.rodriguez@example.com",
    phone: "(408) 555-0102",
    role: "student",
    trainingLevel: "private",
    createdAt: "2025-09-15T08:00:00Z",
  },
  {
    id: "student-003",
    name: "Emily Chen",
    email: "emily.chen@example.com",
    phone: "(415) 555-0103",
    role: "student",
    trainingLevel: "instrument",
    createdAt: "2025-08-20T08:00:00Z",
  },
  {
    id: "student-004",
    name: "Michael Torres",
    email: "michael.torres@example.com",
    phone: "(510) 555-0104",
    role: "student",
    trainingLevel: "student",
    createdAt: "2025-10-10T08:00:00Z",
  },
  {
    id: "student-005",
    name: "Olivia Patel",
    email: "olivia.patel@example.com",
    phone: "(650) 555-0105",
    role: "student",
    trainingLevel: "private",
    createdAt: "2025-09-05T08:00:00Z",
  },
  {
    id: "student-006",
    name: "David Kim",
    email: "david.kim@example.com",
    phone: "(408) 555-0106",
    role: "student",
    trainingLevel: "instrument",
    createdAt: "2025-07-25T08:00:00Z",
  },
  {
    id: "student-007",
    name: "Sophia Williams",
    email: "sophia.williams@example.com",
    phone: "(415) 555-0107",
    role: "student",
    trainingLevel: "student",
    createdAt: "2025-10-15T08:00:00Z",
  },
  {
    id: "student-008",
    name: "Marcus Johnson",
    email: "marcus.johnson@example.com",
    phone: "(510) 555-0108",
    role: "student",
    trainingLevel: "private",
    createdAt: "2025-09-10T08:00:00Z",
  },
];

// ====================================
// California Airports (Real Coordinates)
// ====================================
const airports = {
  pao: {
    name: "Palo Alto Airport (PAO)",
    lat: 37.4611,
    lon: -122.115,
  },
  sql: {
    name: "San Carlos Airport (SQL)",
    lat: 37.5119,
    lon: -122.2495,
  },
  rhv: {
    name: "Reid-Hillview Airport (RHV)",
    lat: 37.3329,
    lon: -121.8195,
  },
  sjc: {
    name: "San Jose International (SJC)",
    lat: 37.3639,
    lon: -121.929,
  },
  hwd: {
    name: "Hayward Executive Airport (HWD)",
    lat: 37.6592,
    lon: -122.1218,
  },
};

// ====================================
// Mock Flight Bookings
// ====================================
export const mockBookings: FlightBookingSeed[] = [
  // Upcoming flights - Student Pilots
  {
    id: "booking-001",
    studentId: "student-001",
    studentName: "Sarah Mitchell",
    scheduledDate: "2025-11-10",
    scheduledTime: "09:00 AM",
    departureLocation: airports.pao,
    status: "scheduled",
    createdAt: "2025-11-01T10:00:00Z",
  },
  {
    id: "booking-002",
    studentId: "student-004",
    studentName: "Michael Torres",
    scheduledDate: "2025-11-11",
    scheduledTime: "10:30 AM",
    departureLocation: airports.sql,
    status: "scheduled",
    createdAt: "2025-11-02T11:00:00Z",
  },
  {
    id: "booking-003",
    studentId: "student-007",
    studentName: "Sophia Williams",
    scheduledDate: "2025-11-12",
    scheduledTime: "02:00 PM",
    departureLocation: airports.pao,
    status: "scheduled",
    createdAt: "2025-11-03T09:00:00Z",
  },

  // Upcoming flights - Private Pilots
  {
    id: "booking-004",
    studentId: "student-002",
    studentName: "James Rodriguez",
    scheduledDate: "2025-11-10",
    scheduledTime: "11:00 AM",
    departureLocation: airports.rhv,
    status: "scheduled",
    createdAt: "2025-11-01T12:00:00Z",
  },
  {
    id: "booking-005",
    studentId: "student-005",
    studentName: "Olivia Patel",
    scheduledDate: "2025-11-13",
    scheduledTime: "08:00 AM",
    departureLocation: airports.sjc,
    status: "scheduled",
    createdAt: "2025-11-04T08:00:00Z",
  },
  {
    id: "booking-006",
    studentId: "student-008",
    studentName: "Marcus Johnson",
    scheduledDate: "2025-11-14",
    scheduledTime: "03:30 PM",
    departureLocation: airports.hwd,
    status: "scheduled",
    createdAt: "2025-11-05T10:00:00Z",
  },

  // Upcoming flights - Instrument Rated
  {
    id: "booking-007",
    studentId: "student-003",
    studentName: "Emily Chen",
    scheduledDate: "2025-11-10",
    scheduledTime: "01:00 PM",
    departureLocation: airports.sql,
    status: "scheduled",
    createdAt: "2025-11-01T14:00:00Z",
  },
  {
    id: "booking-008",
    studentId: "student-006",
    studentName: "David Kim",
    scheduledDate: "2025-11-15",
    scheduledTime: "10:00 AM",
    departureLocation: airports.pao,
    status: "scheduled",
    createdAt: "2025-11-06T09:00:00Z",
  },

  // Some flights with weather status (simulating past weather checks)
  {
    id: "booking-009",
    studentId: "student-001",
    studentName: "Sarah Mitchell",
    scheduledDate: "2025-11-16",
    scheduledTime: "09:30 AM",
    departureLocation: airports.pao,
    status: "scheduled",
    weatherStatus: "unsafe", // Will trigger AI reschedule suggestions
    lastWeatherCheck: "2025-11-08T12:00:00Z",
    createdAt: "2025-11-07T10:00:00Z",
  },
  {
    id: "booking-010",
    studentId: "student-004",
    studentName: "Michael Torres",
    scheduledDate: "2025-11-17",
    scheduledTime: "11:00 AM",
    departureLocation: airports.rhv,
    status: "scheduled",
    weatherStatus: "caution", // Borderline conditions
    lastWeatherCheck: "2025-11-08T12:00:00Z",
    createdAt: "2025-11-07T11:00:00Z",
  },
  {
    id: "booking-011",
    studentId: "student-002",
    studentName: "James Rodriguez",
    scheduledDate: "2025-11-18",
    scheduledTime: "02:00 PM",
    departureLocation: airports.sql,
    status: "scheduled",
    weatherStatus: "safe",
    lastWeatherCheck: "2025-11-08T12:00:00Z",
    createdAt: "2025-11-07T12:00:00Z",
  },

  // Past completed flights
  {
    id: "booking-012",
    studentId: "student-003",
    studentName: "Emily Chen",
    scheduledDate: "2025-11-05",
    scheduledTime: "10:00 AM",
    departureLocation: airports.sjc,
    status: "completed",
    createdAt: "2025-10-28T09:00:00Z",
  },
  {
    id: "booking-013",
    studentId: "student-005",
    studentName: "Olivia Patel",
    scheduledDate: "2025-11-03",
    scheduledTime: "03:00 PM",
    departureLocation: airports.hwd,
    status: "completed",
    createdAt: "2025-10-27T10:00:00Z",
  },

  // Cancelled flights (weather-related)
  {
    id: "booking-014",
    studentId: "student-007",
    studentName: "Sophia Williams",
    scheduledDate: "2025-11-06",
    scheduledTime: "09:00 AM",
    departureLocation: airports.pao,
    status: "cancelled",
    weatherStatus: "unsafe",
    lastWeatherCheck: "2025-11-06T07:00:00Z",
    createdAt: "2025-10-30T09:00:00Z",
  },
  // Additional upcoming flight to reach 15 total
  {
    id: "booking-015",
    studentId: "student-005",
    studentName: "Olivia Patel",
    scheduledDate: "2025-11-19",
    scheduledTime: "12:30 PM",
    departureLocation: airports.sql,
    status: "scheduled",
    createdAt: "2025-11-08T13:00:00Z",
  },
];

// ====================================
// Helper Functions
// ====================================

/**
 * Get all bookings for a specific student
 */
export function getBookingsByStudent(studentId: string): FlightBookingSeed[] {
  return mockBookings.filter((booking) => booking.studentId === studentId);
}

/**
 * Get all upcoming bookings (scheduled status, future dates)
 */
export function getUpcomingBookings(): FlightBookingSeed[] {
  const today = new Date().toISOString().split("T")[0];
  return mockBookings.filter(
    (booking) =>
      booking.status === "scheduled" && booking.scheduledDate >= today
  );
}

/**
 * Get all bookings with unsafe weather status
 */
export function getUnsafeBookings(): FlightBookingSeed[] {
  return mockBookings.filter((booking) => booking.weatherStatus === "unsafe");
}

/**
 * Get student by ID
 */
export function getStudentById(studentId: string): StudentSeed | undefined {
  return mockStudents.find((student) => student.id === studentId);
}

/**
 * Get all students by training level
 */
export function getStudentsByLevel(
  level: "student" | "private" | "instrument"
): StudentSeed[] {
  return mockStudents.filter((student) => student.trainingLevel === level);
}
