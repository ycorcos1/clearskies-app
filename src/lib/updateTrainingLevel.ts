"use client";

import { getFunctions, httpsCallable } from "firebase/functions";

import type { TrainingLevel } from "../data/types";
import app from "./firebaseConfig";

const functions = getFunctions(app, "us-central1");

export const updateTrainingLevel = async (
  newTrainingLevel: TrainingLevel
): Promise<void> => {
  const callable = httpsCallable<{ newTrainingLevel: TrainingLevel }, unknown>(
    functions,
    "updateTrainingLevel"
  );

  await callable({ newTrainingLevel });
};
