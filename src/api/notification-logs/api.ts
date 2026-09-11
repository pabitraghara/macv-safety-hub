import { request, type PaginatedResponse } from "../base/http";
import type {
  DeliveryLogEntry,
  DeliveryLogFilters,
  DeliveryLogSummary,
  DeliverySummaryFilters,
} from "./types";

export class NotificationLogsApi {
  async list(
    filters?: DeliveryLogFilters,
  ): Promise<PaginatedResponse<DeliveryLogEntry>> {
    return request<PaginatedResponse<DeliveryLogEntry>>(
      "GET",
      "/api/v1/notification-logs",
      undefined,
      { params: { ...filters } },
    );
  }

  async summary(filters?: DeliverySummaryFilters): Promise<DeliveryLogSummary> {
    return request<DeliveryLogSummary>(
      "GET",
      "/api/v1/notification-logs/summary",
      undefined,
      { params: { ...filters } },
    );
  }
}

export const notificationLogsApi = new NotificationLogsApi();
