export const Permission = {
  incidentView: "incident:view",
  incidentCreate: "incident:create",
  incidentUpdate: "incident:update",
  incidentDelete: "incident:delete",
  incidentAssign: "incident:assign",

  observationView: "observation:view",
  observationCreate: "observation:create",
  observationUpdate: "observation:update",
  observationDelete: "observation:delete",
  observationReview: "observation:review",

  cameraView: "camera:view",
  cameraUpdate: "camera:update",
  cameraDelete: "camera:delete",

  violationTypeView: "violation_type:view",
  violationTypeCreate: "violation_type:create",
  violationTypeUpdate: "violation_type:update",
  violationTypeDelete: "violation_type:delete",

  userView: "user:view",
  userCreate: "user:create",
  userUpdate: "user:update",
  userDelete: "user:delete",

  siteView: "site:view",
  siteManage: "site:manage",

  organisationView: "organisation:view",
  organisationManage: "organisation:manage",

  useCaseView: "use_case:view",
  useCaseCreate: "use_case:create",
  useCaseUpdate: "use_case:update",
  useCaseDelete: "use_case:delete",

  modelView: "model:view",
  modelCreate: "model:create",
  modelUpdate: "model:update",
  modelDelete: "model:delete",

  reportView: "report:view",
  reportExport: "report:export",

  filterDefinitionView: "filter_definition:view",
  filterDefinitionCreate: "filter_definition:create",
  filterDefinitionUpdate: "filter_definition:update",
  filterDefinitionDelete: "filter_definition:delete",

  alertPolicyView: "alert_policy:view",
  alertPolicyCreate: "alert_policy:create",
  alertPolicyUpdate: "alert_policy:update",
  alertPolicyDelete: "alert_policy:delete",

  videoUploadView: "video_upload:view",
  videoUploadCreate: "video_upload:h",
  videoUploadUpdate: "video_upload:update",
  videoUploadDelete: "video_upload:delete",

  // Vehicles module (ALPR / speed detection / vehicle registry / people).
  // Possession of ANY of these scopes entitles the Vehicles nav section.
  // One unified scope family (2026-07-15 consolidation): vehicle:view/manage
  // cover ALPR detections, speed violations, and the registry alike — the
  // per-feature alpr:* / speed_violation:* scopes no longer exist.
  vehicleView: "vehicle:view",
  vehicleManage: "vehicle:manage",
  personView: "person:view",
  personManage: "person:manage",

  // Cranes module (crane proximity). `crane:view` reads the live map, the
  // alert history, and the thresholds; `crane:manage` covers crane CRUD,
  // threshold edits, and acknowledging/resolving alerts. The edge box's
  // ingest scope (`crane:ingest`) is machine-to-machine and is never held by
  // a dashboard user, so it is deliberately absent here.
  craneView: "crane:view",
  craneManage: "crane:manage",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS = Object.values(Permission) as Permission[];
