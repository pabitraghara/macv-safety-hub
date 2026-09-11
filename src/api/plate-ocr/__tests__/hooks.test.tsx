import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/plate-ocr/api", () => ({
  plateOcrApi: {
    list: vi.fn(),
    summary: vi.fn(),
    review: vi.fn(),
    requeue: vi.fn(),
    listTrainingRuns: vi.fn(),
    createTrainingRun: vi.fn(),
    promoteTrainingRun: vi.fn(),
    verificationSummary: vi.fn(),
    listVerificationRuns: vi.fn(),
    createVerificationRun: vi.fn(),
    cancelVerificationRun: vi.fn(),
  },
}));

import { plateOcrApi } from "@/api/plate-ocr/api";
import {
  usePlateOcrReviewQueue,
  usePlateOcrTrainingRuns,
  usePlateOcrVerificationRuns,
} from "../hooks";
import type {
  PlateOcrSample,
  PlateOcrSamplePage,
  PlateOcrTrainingRun,
  PlateOcrVerificationRun,
  PlateOcrVerificationSummary,
} from "../types";

const sample = {
  id: "sample-1",
  source_type: "gate_alpr",
  review_status: "unreviewed",
  normalized_text: "ABC123",
} as PlateOcrSample;

const page: PlateOcrSamplePage = {
  data: [sample],
  total_count: 1,
  page: 1,
  page_size: 25,
  total_pages: 1,
};

const summary = {
  total: 1,
  verification_statuses: { disagreement: 1 },
  review_statuses: { unreviewed: 1 },
  training_eligible: 0,
};

const trainingRun = {
  id: "run-1",
  name: "OCR fine-tune",
  status: "ready",
  evaluation_passed: true,
} as PlateOcrTrainingRun;

const verificationSummary = {
  enabled: true,
  pending_sample_count: 100,
  request_count: 0,
  total_token_count: 0,
  estimated_cost_usd: 0,
} as PlateOcrVerificationSummary;

const verificationRun = {
  id: "verification-1",
  name: "Newest 100",
  status: "completed",
  selected_count: 100,
} as PlateOcrVerificationRun;

describe("usePlateOcrReviewQueue", () => {
  beforeEach(() => {
    vi.mocked(plateOcrApi.list).mockReset().mockResolvedValue(page);
    vi.mocked(plateOcrApi.summary).mockReset().mockResolvedValue(summary);
    vi.mocked(plateOcrApi.review).mockReset().mockResolvedValue(sample);
    vi.mocked(plateOcrApi.requeue).mockReset().mockResolvedValue(sample);
    vi.mocked(plateOcrApi.listTrainingRuns)
      .mockReset()
      .mockResolvedValue({
        data: [trainingRun],
        total_count: 1,
        page: 1,
        page_size: 5,
        total_pages: 1,
      });
    vi.mocked(plateOcrApi.createTrainingRun)
      .mockReset()
      .mockResolvedValue(trainingRun);
    vi.mocked(plateOcrApi.promoteTrainingRun)
      .mockReset()
      .mockResolvedValue({ ...trainingRun, status: "promoted" });
  });

  it("loads samples and summary together", async () => {
    const params = { review_status: "unreviewed", page_size: 25 };
    const { result } = renderHook(() => usePlateOcrReviewQueue(params));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.page).toEqual(page);
    expect(result.current.summary).toEqual(summary);
    expect(plateOcrApi.list).toHaveBeenCalledWith(params);
    expect(plateOcrApi.summary).toHaveBeenCalledOnce();
  });

  it("submits a review and refreshes the queue", async () => {
    const { result } = renderHook(() =>
      usePlateOcrReviewQueue({ review_status: "unreviewed" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.review("sample-1", { action: "accept_edge" });
    });

    expect(plateOcrApi.review).toHaveBeenCalledWith("sample-1", {
      action: "accept_edge",
    });
    expect(plateOcrApi.list).toHaveBeenCalledTimes(2);
    expect(plateOcrApi.summary).toHaveBeenCalledTimes(2);
    expect(result.current.submitting).toBe(false);
  });
});

describe("usePlateOcrTrainingRuns", () => {
  beforeEach(() => {
    vi.mocked(plateOcrApi.listTrainingRuns)
      .mockReset()
      .mockResolvedValue({
        data: [trainingRun],
        total_count: 1,
        page: 1,
        page_size: 5,
        total_pages: 1,
      });
    vi.mocked(plateOcrApi.createTrainingRun)
      .mockReset()
      .mockResolvedValue(trainingRun);
    vi.mocked(plateOcrApi.promoteTrainingRun)
      .mockReset()
      .mockResolvedValue({ ...trainingRun, status: "promoted" });
  });

  it("loads runs and refreshes after creating one", async () => {
    const { result } = renderHook(() => usePlateOcrTrainingRuns());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.runs).toEqual([trainingRun]);

    await act(async () => {
      await result.current.create();
    });

    expect(plateOcrApi.createTrainingRun).toHaveBeenCalledWith({});
    expect(plateOcrApi.listTrainingRuns).toHaveBeenCalledTimes(2);
  });
});

describe("usePlateOcrVerificationRuns", () => {
  beforeEach(() => {
    vi.mocked(plateOcrApi.verificationSummary)
      .mockReset()
      .mockResolvedValue(verificationSummary);
    vi.mocked(plateOcrApi.listVerificationRuns)
      .mockReset()
      .mockResolvedValue({
        data: [verificationRun],
        total_count: 1,
        page: 1,
        page_size: 5,
        total_pages: 1,
      });
    vi.mocked(plateOcrApi.createVerificationRun)
      .mockReset()
      .mockResolvedValue(verificationRun);
    vi.mocked(plateOcrApi.cancelVerificationRun)
      .mockReset()
      .mockResolvedValue({ ...verificationRun, status: "cancelled" });
  });

  it("loads usage and refreshes after starting a bounded campaign", async () => {
    const { result } = renderHook(() => usePlateOcrVerificationRuns());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary).toEqual(verificationSummary);
    expect(result.current.runs).toEqual([verificationRun]);

    await act(async () => {
      await result.current.create({ sample_count: 100 });
    });

    expect(plateOcrApi.createVerificationRun).toHaveBeenCalledWith({
      sample_count: 100,
    });
    expect(plateOcrApi.verificationSummary).toHaveBeenCalledTimes(2);
    expect(plateOcrApi.listVerificationRuns).toHaveBeenCalledTimes(2);
  });
});
