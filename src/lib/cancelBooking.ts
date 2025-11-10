"use client";

import { getFunctions, httpsCallable } from "firebase/functions";

import app from "./firebaseConfig";

const functions = getFunctions(app, "us-central1");

interface CancelBookingResponse {
  success: boolean;
}

export const cancelBooking = async (bookingId: string): Promise<void> => {
  if (!bookingId) {
    throw new Error("Invalid booking identifier.");
  }

  const callable = httpsCallable<{ bookingId: string }, CancelBookingResponse>(
    functions,
    "cancelBooking"
  );

  const result = await callable({ bookingId });

  if (!result.data?.success) {
    throw new Error("Cancellation failed. Please try again.");
  }
};
