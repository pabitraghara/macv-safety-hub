import type { LogtoConfig } from "@logto/react";
import { UserScope } from "@logto/react";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export const logtoConfig: LogtoConfig = {
  endpoint: process.env.NEXT_PUBLIC_LOGTO_ENDPOINT!,
  appId: process.env.NEXT_PUBLIC_LOGTO_APP_ID!,
  resources: [process.env.NEXT_PUBLIC_API_RESOURCE!],
  scopes: [
    UserScope.Profile,
    UserScope.Organizations,
    UserScope.OrganizationRoles,
    ...ALL_PERMISSIONS,
  ],
};
