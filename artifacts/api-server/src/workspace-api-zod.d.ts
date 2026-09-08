type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; error: { issues?: unknown[] } };

interface WorkspaceZodSchema<T = any> {
  parse(value: unknown): T;
  safeParse(value: unknown): ParseSuccess<T> | ParseFailure;
}

declare module "@workspace/api-zod" {
  export const HealthCheckResponse: WorkspaceZodSchema<{ status: string }>;
  export const AdminLoginBody: WorkspaceZodSchema<{ email: string; password: string }>;
  export const AdminLoginResponse: WorkspaceZodSchema<{
    email: string;
    fullName: string;
    token: string;
  }>;
  export const GetAdminMeResponse: WorkspaceZodSchema<{ email: string; fullName: string }>;
  export const GetAdminDashboardStatsResponse: WorkspaceZodSchema<any>;
  export const GetAdminApplicationsQueryParams: WorkspaceZodSchema<{
    search?: string;
    status?: string;
    page: number;
    size: number;
  }>;
  export const GetAdminApplicationsResponse: WorkspaceZodSchema<any>;
  export const GetAdminRecentApplicationsQueryParams: WorkspaceZodSchema<{ limit: number }>;
  export const GetAdminRecentApplicationsResponse: WorkspaceZodSchema<any>;
  export const GetAdminApplicationParams: WorkspaceZodSchema<{ id: number }>;
  export const GetAdminApplicationResponse: WorkspaceZodSchema<any>;
  export const ReviewAdminApplicationParams: WorkspaceZodSchema<{ id: number }>;
  export const ReviewAdminApplicationBody: WorkspaceZodSchema<{
    reviewStatus: string;
    notes?: string | null;
  }>;
  export const ReviewAdminApplicationResponse: WorkspaceZodSchema<any>;
}