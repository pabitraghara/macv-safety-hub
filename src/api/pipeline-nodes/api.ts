import { request } from "../base/http";
import type {
  CreateNodeRequest,
  PipelineNode,
  UpdateNodeRequest,
} from "./types";

export class PipelineNodesApi {
  async getNodes(): Promise<PipelineNode[]> {
    return request<PipelineNode[]>("GET", "/api/v1/pipeline-nodes");
  }

  async createNode(body: CreateNodeRequest): Promise<PipelineNode> {
    return request<PipelineNode>("POST", "/api/v1/pipeline-nodes", body);
  }

  async updateNode(
    nodeId: string,
    body: UpdateNodeRequest,
  ): Promise<PipelineNode> {
    return request<PipelineNode>(
      "PATCH",
      `/api/v1/pipeline-nodes/${nodeId}`,
      body,
    );
  }

  async deleteNode(nodeId: string): Promise<void> {
    return request<void>("DELETE", `/api/v1/pipeline-nodes/${nodeId}`);
  }
}

export const pipelineNodesApi = new PipelineNodesApi();
