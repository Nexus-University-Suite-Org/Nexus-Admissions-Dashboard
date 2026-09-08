type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; error: { issues?: unknown[] } };

export interface WorkspaceZodSchema<T = any> {
  parse(value: unknown): T;
  safeParse(value: unknown): ParseSuccess<T> | ParseFailure;
}

function makeSchema<T>(): WorkspaceZodSchema<T> {
  return {
    parse: (value) => value as T,
    safeParse: (value) => ({ success: true, data: value as T }),
  };
}

export const HealthCheckResponse: WorkspaceZodSchema<{ status: string }> =
  makeSchema<{ status: string }>();
export const AdminLoginBody: WorkspaceZodSchema<{ email: string; password: string }> =
  makeSchema<{ email: string; password: string }>();
export const AdminLoginResponse: WorkspaceZodSchema<{
  email: string;
  fullName: string;
  token: string;
}> = makeSchema<{ email: string; fullName: string; token: string }>();
export const GetAdminMeResponse: WorkspaceZodSchema<{ email: string; fullName: string }> =
  makeSchema<{ email: string; fullName: string }>();
export const GetAdminDashboardStatsResponse: WorkspaceZodSchema<any> = makeSchema<any>();
export const GetAdminApplicationsQueryParams: WorkspaceZodSchema<{
  search?: string;
  status?: string;
  page: number;
  size: number;
}> = makeSchema<{ search?: string; status?: string; page: number; size: number }>();
export const GetAdminApplicationsResponse: WorkspaceZodSchema<any> = makeSchema<any>();
export const GetAdminRecentApplicationsQueryParams: WorkspaceZodSchema<{ limit: number }> =
  makeSchema<{ limit: number }>();
export const GetAdminRecentApplicationsResponse: WorkspaceZodSchema<any> = makeSchema<any>();
export const GetAdminApplicationParams: WorkspaceZodSchema<{ id: number }> =
  makeSchema<{ id: number }>();
export const GetAdminApplicationResponse: WorkspaceZodSchema<any> = makeSchema<any>();
export const ReviewAdminApplicationParams: WorkspaceZodSchema<{ id: number }> =
  makeSchema<{ id: number }>();
export const ReviewAdminApplicationBody: WorkspaceZodSchema<{
  reviewStatus: string;
  notes?: string | null;
}> = makeSchema<{ reviewStatus: string; notes?: string | null }>();
export const ReviewAdminApplicationResponse: WorkspaceZodSchema<any> = makeSchema<any>();