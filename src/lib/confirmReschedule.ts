"use client";

import { getFunctions, httpsCallable } from "firebase/functions";

import app from "./firebaseConfig";

const functions = getFunctions(app, "us-central1");

interface ConfirmRescheduleParams {
  bookingId: string;
  newDate: string;
  newTime: string;
  aiExplanation?: string;
}

interface ConfirmRescheduleResponse {
  success: boolean;
  newDate: string;
  newTime: string;
}

export const confirmReschedule = async (
  params: ConfirmRescheduleParams
): Promise<ConfirmRescheduleResponse> => {
  const callable = httpsCallable<
    ConfirmRescheduleParams,
    ConfirmRescheduleResponse
  >(functions, "confirmReschedule");

  const result = await callable({
    bookingId: params.bookingId,
    newDate: params.newDate,
    newTime: params.newTime,
    aiExplanation: params.aiExplanation,
  });

  if (!result.data?.success) {
    throw new Error("Reschedule confirmation failed. Please try again.");
  }

  return result.data;
};
