"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import type {
  AIRescheduleResponse,
  AIRescheduleSuggestion,
  TrainingLevel,
} from "../data/types";
import { db } from "../lib/firebaseConfig";
import {
  requestAIReschedule,
  type RequestAIRescheduleParams,
} from "../lib/aiRescheduler";

export interface AiRescheduleEntry {
  id: string;
  explanation: string;
  suggestions: AIRescheduleSuggestion[];
  createdAt?: Timestamp;
  trainingLevel?: TrainingLevel;
  violations?: string[];
}

interface UseAiReschedulesState {
  latest: AiRescheduleEntry | null;
  history: AiRescheduleEntry[];
  loading: boolean;
  generating: boolean;
  error?: string;
  generate: (
    params: RequestAIRescheduleParams
  ) => Promise<AIRescheduleResponse>;
}

const deserializeEntry = (
  doc: QueryDocumentSnapshot<DocumentData>
): AiRescheduleEntry | null => {
  const data = doc.data() as Record<string, unknown>;

  if (
    typeof data.explanation !== "string" ||
    !Array.isArray(data.suggestions)
  ) {
    return null;
  }

  return {
    id: doc.id,
    explanation: data.explanation,
    suggestions: data.suggestions as AIRescheduleSuggestion[],
    createdAt: (data.createdAt as Timestamp | undefined) ?? undefined,
    trainingLevel: data.trainingLevel as TrainingLevel | undefined,
    violations: Array.isArray(data.violations)
      ? (data.violations as string[])
      : undefined,
  };
};

export const useAiReschedules = (bookingId?: string): UseAiReschedulesState => {
  const [history, setHistory] = useState<AiRescheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!bookingId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);

    const collRef = collection(db, "bookings", bookingId, "aiReschedules");
    const queryRef = query(collRef, orderBy("createdAt", "desc"), limit(5));

    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        const entries = snapshot.docs
          .map(deserializeEntry)
          .filter((entry): entry is AiRescheduleEntry => entry != null);
        setHistory(entries);
        setLoading(false);
      },
      (err: FirestoreError) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [bookingId]);

  const latest = useMemo(() => history[0] ?? null, [history]);

  const generate = useCallback(
    async (
      params: RequestAIRescheduleParams
    ): Promise<AIRescheduleResponse> => {
      setGenerating(true);
      setError(undefined);

      try {
        const response = await requestAIReschedule(params);
        return response;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to request AI reschedule suggestions.";
        setError(message);
        throw new Error(message);
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  return {
    latest,
    history,
    loading,
    generating,
    error,
    generate,
  };
};
