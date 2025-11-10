import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

import type { Student } from "../data/types";
import { db } from "./firebaseConfig";

export const getFirstInstructorId = async (): Promise<string | null> => {
  const instructorsQuery = query(
    collection(db, "students"),
    where("role", "==", "instructor"),
    limit(1)
  );

  const snapshot = await getDocs(instructorsQuery);
  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].id;
};

export const getUserProfile = async (uid: string): Promise<Student | null> => {
  const docRef = doc(db, "students", uid);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Student;
};
