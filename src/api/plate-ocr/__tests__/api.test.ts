import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/base/http", () => ({ request: vi.fn() }));

import { request } from "@/api/base/http";
import { plateOcrApi } from "../api";

const mockedRequest = vi.mocked(request);

describe("plateOcrApi", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue(undefined as never);
  });

  it("lists the org-scoped review queue with filters", async () => {
    const params = {
      page: 2,
      source_type: "speed_violation" as const,
      review_status: "unreviewed",
    };
    await plateOcrApi.list(params);

    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/plate-ocr-samples/",
      undefined,
      { params },
    );
  });

  it("loads queue totals", async () => {
    await plateOcrApi.summary();
    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/plate-ocr-samples/summary",
    );
  });

  it("submits a human correction", async () => {
    const payload = {
      action: "correct" as const,
      corrected_text: "ABC123",
      notes: "clear crop",
    };
    await plateOcrApi.review("sample-1", payload);

    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/plate-ocr-samples/sample-1/review",
      payload,
    );
  });

  it("requeues Gemini verification", async () => {
    await plateOcrApi.requeue("sample-1");
    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/plate-ocr-samples/sample-1/requeue",
    );
  });

  it("lists recent training runs", async () => {
    await plateOcrApi.listTrainingRuns(2, 10);
    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/plate-ocr-training/runs",
      undefined,
      { params: { page: 2, page_size: 10 } },
    );
  });

  it("creates a training run with automated defaults", async () => {
    await plateOcrApi.createTrainingRun();
    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/plate-ocr-training/runs",
      {},
    );
  });

  it("promotes an evaluated candidate", async () => {
    await plateOcrApi.promoteTrainingRun("run-1");
    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/plate-ocr-training/runs/run-1/promote",
    );
  });

  it("loads application Gemini usage", async () => {
    await plateOcrApi.verificationSummary();
    expect(mockedRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/plate-ocr-verification/summary",
    );
  });

  it("starts and cancels a bounded verification campaign", async () => {
    await plateOcrApi.createVerificationRun({ sample_count: 100 });
    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/plate-ocr-verification/runs",
      { sample_count: 100 },
    );

    await plateOcrApi.cancelVerificationRun("verification-1");
    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/plate-ocr-verification/runs/verification-1/cancel",
    );
  });
});
