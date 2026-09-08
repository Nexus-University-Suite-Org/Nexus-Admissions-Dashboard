import * as zod from "zod";

const emailRegExp = new RegExp("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

export const HealthCheckResponse = zod.object({
  status: zod.string(),
});

export const AdminLoginBody = zod.object({
  email: zod.string().regex(emailRegExp),
  password: zod.string().min(1),
});

export const AdminLoginResponse = zod
  .object({
    email: zod.string().regex(emailRegExp),
    fullName: zod.string(),
  })
  .and(
    zod.object({
      token: zod.string(),
    }),
  );

export const GetAdminMeResponse = zod.object({
  email: zod.string().regex(emailRegExp),
  fullName: zod.string(),
});

export const GetAdminDashboardStatsResponse = zod.object({
  totalApplications: zod.number(),
  pendingReview: zod.number(),
  admitted: zod.number(),
  rejected: zod.number(),
  waitlisted: zod.number(),
  draft: zod.number(),
  monthlyTrend: zod.record(zod.string(), zod.number()),
});

export const GetAdminApplicationsQueryParams = zod.object({
  status: zod
    .enum(["ALL", "DRAFT", "SUBMITTED", "ADMITTED", "REJECTED", "WAITLISTED"])
    .default("ALL"),
  search: zod.coerce.string().optional(),
  page: zod.coerce.number().min(0).default(0),
  size: zod.coerce.number().min(1).max(50).default(10),
});

const applicationItem = zod.object({
  id: zod.number(),
  prn: zod.string(),
  firstName: zod.string(),
  lastName: zod.string(),
  otherNames: zod.string(),
  email: zod.string().regex(emailRegExp),
  phoneNumber: zod.string(),
  gender: zod.string(),
  dateOfBirth: zod.string(),
  nationality: zod.string(),
  district: zod.string(),
  subcounty: zod.string(),
  village: zod.string(),
  programChoice1: zod.string(),
  programChoice2: zod.string(),
  programChoice3: zod.string(),
  studyMode: zod.string(),
  academicYear: zod.string(),
  semester: zod.string(),
  emailVerified: zod.boolean(),
  status: zod.enum(["DRAFT", "SUBMITTED", "ADMITTED", "REJECTED", "WAITLISTED"]),
  reviewStatus: zod.string(),
  submittedAt: zod.string().nullable(),
  reviewedAt: zod.string().nullable(),
  reviewerNotes: zod.string().nullable(),
  uceResult: zod.string(),
  uaceResult: zod.string(),
  documents: zod.string(),
  extras: zod.string(),
  feePaid: zod.number(),
  feeRequired: zod.number(),
  feeCurrency: zod.string(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const GetAdminApplicationsResponse = zod.object({
  content: zod.array(applicationItem),
  page: zod.number(),
  size: zod.number(),
  totalElements: zod.number(),
  totalPages: zod.number(),
});

export const GetAdminRecentApplicationsQueryParams = zod.object({
  limit: zod.coerce.number().min(1).max(10).default(5),
});

export const GetAdminRecentApplicationsResponse = zod.array(applicationItem);

export const GetAdminApplicationParams = zod.object({
  id: zod.coerce.number(),
});

export const GetAdminApplicationResponse = applicationItem;

export const ReviewAdminApplicationParams = zod.object({
  id: zod.coerce.number(),
});

export const ReviewAdminApplicationBody = zod.object({
  reviewStatus: zod.enum(["admitted", "rejected", "waitlisted"]),
  notes: zod.string(),
});

export const ReviewAdminApplicationResponse = applicationItem;