import { getApps, initializeApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import {
  mockBookings,
  mockStudents,
  type FlightBookingSeed,
  type StudentSeed,
} from "../data/mockData";

type EmulatorConfig = {
  host: string;
  port: number;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "clearskies-app",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "demo.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:000000000000:web:demo",
};

function parseEmulatorHost(value: string): EmulatorConfig {
  const [host, portString] = value.split(":");
  const port = Number(portString);

  if (!host || Number.isNaN(port)) {
    throw new Error(
      `Invalid FIRESTORE_EMULATOR_HOST value "${value}". Expected format host:port.`
    );
  }

  return { host, port };
}

async function getDb(): Promise<Firestore> {
  if (!firebaseConfig.projectId) {
    throw new Error(
      "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable or fallback project ID."
    );
  }

  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  const db = getFirestore(app);

  const useEmulator =
    process.env.USE_FIRESTORE_EMULATOR === "true" ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (useEmulator) {
    const emulator: EmulatorConfig =
      process.env.FIRESTORE_EMULATOR_HOST != null
        ? parseEmulatorHost(process.env.FIRESTORE_EMULATOR_HOST)
        : { host: "127.0.0.1", port: 8080 };

    connectFirestoreEmulator(db, emulator.host, emulator.port);
    console.log(
      `Connected to Firestore Emulator at ${emulator.host}:${emulator.port}`
    );
  }

  return db;
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  return new Date(value);
}

async function seedStudents(db: Firestore, students: StudentSeed[]) {
  await Promise.all(
    students.map((student) => {
      const ref = doc(db, "students", student.id);
      return setDoc(ref, {
        ...student,
        createdAt: toDate(student.createdAt),
      });
    })
  );
  console.log(`Seeded ${students.length} students`);
}

async function seedBookings(db: Firestore, bookings: FlightBookingSeed[]) {
  await Promise.all(
    bookings.map((booking) => {
      const ref = doc(db, "bookings", booking.id);
      return setDoc(ref, {
        ...booking,
        createdAt: toDate(booking.createdAt),
        lastWeatherCheck: toDate(booking.lastWeatherCheck),
      });
    })
  );
  console.log(`Seeded ${bookings.length} bookings`);
}

async function main() {
  const db = await getDb();
  await seedStudents(db, mockStudents);
  await seedBookings(db, mockBookings);
  console.log("✅ Firestore seeding complete.");
}

main().catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});
