import { Router, type IRouter, type Request, type Response } from "express";
import {
  AdminLoginBody,
  AdminLoginResponse,
  GetAdminMeResponse,
  GetAdminDashboardStatsResponse,
  GetAdminApplicationsQueryParams,
  GetAdminApplicationsResponse,
  GetAdminRecentApplicationsQueryParams,
  GetAdminRecentApplicationsResponse,
  GetAdminApplicationParams,
  GetAdminApplicationResponse,
  ReviewAdminApplicationParams,
  ReviewAdminApplicationBody,
  ReviewAdminApplicationResponse,
} from "@workspace/api-zod";

type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "ADMITTED"
  | "REJECTED"
  | "WAITLISTED";

type Application = {
  id: number;
  prn: string;
  firstName: string;
  lastName: string;
  otherNames: string;
  email: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  district: string;
  subcounty: string;
  village: string;
  programChoice1: string;
  programChoice2: string;
  programChoice3: string;
  studyMode: string;
  academicYear: string;
  semester: string;
  emailVerified: boolean;
  status: ApplicationStatus;
  reviewStatus: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  uceResult: string;
  uaceResult: string;
  documents: string;
  extras: string;
  feePaid: number;
  feeRequired: number;
  feeCurrency: string;
  createdAt: string;
  updatedAt: string;
};

const TOKEN = "nexus-admin-demo-token";
const ADMIN = { email: "admin@nexus.edu", fullName: "Dr. Miriam Nambassa" };
const now = new Date("2026-08-26T08:00:00.000Z");
const iso = (daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

const applications: Application[] = [
  {
    id: 1042,
    prn: "NEX-26-1042",
    firstName: "Amina",
    lastName: "Nabirye",
    otherNames: "Sarah",
    email: "amina.nabirye@example.com",
    phoneNumber: "+256 701 245 801",
    gender: "Female",
    dateOfBirth: "2005-04-18",
    nationality: "Ugandan",
    district: "Jinja",
    subcounty: "Buwenge",
    village: "Kakira",
    programChoice1: "Bachelor of Computer Science",
    programChoice2: "Bachelor of Information Systems",
    programChoice3: "Bachelor of Statistics",
    studyMode: "Day",
    academicYear: "2026/2027",
    semester: "Semester 1",
    emailVerified: true,
    status: "SUBMITTED",
    reviewStatus: "Pending review",
    submittedAt: iso(1),
    reviewedAt: null,
    reviewerNotes: null,
    uceResult: '{"Mathematics":"A","English":"A","Physics":"B","Chemistry":"B"}',
    uaceResult: '{"Mathematics":"A","Physics":"B","General Paper":"A","points":18}',
    documents: '["National ID","UCE Certificate","UACE Certificate","Passport Photo"]',
    extras: '{"scholarshipRequested":true,"accommodation":true}',
    feePaid: 50000,
    feeRequired: 50000,
    feeCurrency: "UGX",
    createdAt: iso(4),
    updatedAt: iso(1),
  },
  {
    id: 1041,
    prn: "NEX-26-1041",
    firstName: "Daniel",
    lastName: "Okello",
    otherNames: "Mark",
    email: "daniel.okello@example.com",
    phoneNumber: "+256 772 893 114",
    gender: "Male",
    dateOfBirth: "2004-11-02",
    nationality: "Ugandan",
    district: "Gulu",
    subcounty: "Layibi",
    village: "Olya",
    programChoice1: "Bachelor of Business Administration",
    programChoice2: "Bachelor of Economics",
    programChoice3: "Bachelor of Commerce",
    studyMode: "Day",
    academicYear: "2026/2027",
    semester: "Semester 1",
    emailVerified: true,
    status: "SUBMITTED",
    reviewStatus: "Pending review",
    submittedAt: iso(2),
    reviewedAt: null,
    reviewerNotes: null,
    uceResult: '{"Mathematics":"B","English":"A","Geography":"A","Entrepreneurship":"A"}',
    uaceResult: '{"Economics":"A","Entrepreneurship":"B","General Paper":"A","points":15}',
    documents: '["National ID","UCE Certificate","UACE Certificate"]',
    extras: '{"scholarshipRequested":false,"accommodation":true}',
    feePaid: 50000,
    feeRequired: 50000,
    feeCurrency: "UGX",
    createdAt: iso(5),
    updatedAt: iso(2),
  },
  {
    id: 1040,
    prn: "NEX-26-1040",
    firstName: "Grace",
    lastName: "Atim",
    otherNames: "",
    email: "grace.atim@example.com",
    phoneNumber: "+256 783 456 220",
    gender: "Female",
    dateOfBirth: "2005-01-26",
    nationality: "Ugandan",
    district: "Lira",
    subcounty: "Adyel",
    village: "Ojwina",
    programChoice1: "Bachelor of Public Health",
    programChoice2: "Bachelor of Biomedical Sciences",
    programChoice3: "Bachelor of Nursing Science",
    studyMode: "Day",
    academicYear: "2026/2027",
    semester: "Semester 1",
    emailVerified: true,
    status: "ADMITTED",
    reviewStatus: "Admitted",
    submittedAt: iso(8),
    reviewedAt: iso(3),
    reviewerNotes: "Strong science results and compelling community health statement.",
    uceResult: '{"Mathematics":"A","English":"A","Biology":"A","Chemistry":"A"}',
    uaceResult: '{"Biology":"A","Chemistry":"A","General Paper":"A","points":19}',
    documents: '["National ID","UCE Certificate","UACE Certificate","Recommendation Letter"]',
    extras: '{"scholarshipRequested":true,"accommodation":true}',
    feePaid: 50000,
    feeRequired: 50000,
    feeCurrency: "UGX",
    createdAt: iso(12),
    updatedAt: iso(3),
  },
  {
    id: 1039,
    prn: "NEX-26-1039",
    firstName: "Joseph",
    lastName: "Mugisha",
    otherNames: "Paul",
    email: "joseph.mugisha@example.com",
    phoneNumber: "+256 759 112 883",
    gender: "Male",
    dateOfBirth: "2004-08-14",
    nationality: "Ugandan",
    district: "Mbarara",
    subcounty: "Kakoba",
    village: "Ruti",
    programChoice1: "Bachelor of Civil Engineering",
    programChoice2: "Bachelor of Mechanical Engineering",
    programChoice3: "Bachelor of Architecture",
    studyMode: "Day",
    academicYear: "2026/2027",
    semester: "Semester 1",
    emailVerified: true,
    status: "WAITLISTED",
    reviewStatus: "Waitlisted",
    submittedAt: iso(14),
    reviewedAt: iso(7),
    reviewerNotes: "Good profile; held for second-round capacity review.",
    uceResult: '{"Mathematics":"A","English":"B","Physics":"A","Chemistry":"B"}',
    uaceResult: '{"Mathematics":"B","Physics":"B","General Paper":"A","points":14}',
    documents: '["National ID","UCE Certificate","UACE Certificate"]',
    extras: '{"scholarshipRequested":false,"accommodation":false}',
    feePaid: 50000,
    feeRequired: 50000,
    feeCurrency: "UGX",
    createdAt: iso(17),
    updatedAt: iso(7),
  },
  {
    id: 1038,
    prn: "NEX-26-1038",
    firstName: "Ruth",
    lastName: "Nakanwagi",
    otherNames: "",
    email: "ruth.nakanwagi@example.com",
    phoneNumber: "+256 704 883 421",
    gender: "Female",
    dateOfBirth: "2005-06-09",
    nationality: "Ugandan",
    district: "Wakiso",
    subcounty: "Kira",
    village: "Kiwologoma",
    programChoice1: "Bachelor of Laws",
    programChoice2: "Bachelor of Arts in Social Sciences",
    programChoice3: "Bachelor of Journalism",
    studyMode: "Day",
    academicYear: "2026/2027",
    semester: "Semester 1",
    emailVerified: true,
    status: "REJECTED",
    reviewStatus: "Rejected",
    submittedAt: iso(21),
    reviewedAt: iso(11),
    reviewerNotes: "Did not meet the minimum subject requirements for the selected programmes.",
    uceResult: '{"Mathematics":"C","English":"B","History":"C","Geography":"C"}',
    uaceResult: '{"History":"C","General Paper":"C","points":8}',
    documents: '["National ID","UCE Certificate","UACE Certificate"]',
    extras: '{"scholarshipRequested":false,"accommodation":false}',
    feePaid: 50000,
    feeRequired: 50000,
    feeCurrency: "UGX",
    createdAt: iso(24),
    updatedAt: iso(11),
  },
  {
    id: 1037,
    prn: "NEX-26-1037",
    firstName: "Brian",
    lastName: "Ssemanda",
    otherNames: "Ivan",
    email: "brian.ssemanda@example.com",
    phoneNumber: "+256 786 332 109",
    gender: "Male",
    dateOfBirth: "2005-03-22",
    nationality: "Ugandan",
    district: "Mukono",
    subcounty: "Goma",
    village: "Seeta",
    programChoice1: "Bachelor of Information Technology",
    programChoice2: "Bachelor of Computer Science",
    programChoice3: "Bachelor of Data Science",
    studyMode: "Weekend",
    academicYear: "2026/2027",
    semester: "Semester 1",
    emailVerified: true,
    status: "SUBMITTED",
    reviewStatus: "Pending review",
    submittedAt: iso(28),
    reviewedAt: null,
    reviewerNotes: null,
    uceResult: '{"Mathematics":"A","English":"B","Physics":"B","ICT":"A"}',
    uaceResult: '{"Mathematics":"B","ICT":"A","General Paper":"A","points":16}',
    documents: '["National ID","UCE Certificate","UACE Certificate","Portfolio"]',
    extras: '{"scholarshipRequested":false,"accommodation":false}',
    feePaid: 50000,
    feeRequired: 50000,
    feeCurrency: "UGX",
    createdAt: iso(31),
    updatedAt: iso(28),
  },
  {
    id: 1036,
    prn: "NEX-26-1036",
    firstName: "Martha",
    lastName: "Akello",
    otherNames: "Jane",
    email: "martha.akello@example.com",
    phoneNumber: "+256 750 901 744",
    gender: "Female",
    dateOfBirth: "2004-12-30",
    nationality: "Ugandan",
    district: "Soroti",
    subcounty: "Asuret",
    village: "Arapai",
    programChoice1: "Bachelor of Education (Arts)",
    programChoice2: "Bachelor of Arts in Development Studies",
    programChoice3: "Bachelor of Social Work",
    studyMode: "Day",
    academicYear: "2026/2027",
    semester: "Semester 1",
    emailVerified: false,
    status: "DRAFT",
    reviewStatus: "Not submitted",
    submittedAt: null,
    reviewedAt: null,
    reviewerNotes: null,
    uceResult: "{}",
    uaceResult: "{}",
    documents: '["Passport Photo"]',
    extras: '{"scholarshipRequested":false,"accommodation":true}',
    feePaid: 0,
    feeRequired: 50000,
    feeCurrency: "UGX",
    createdAt: iso(32),
    updatedAt: iso(32),
  },
  {
    id: 1035,
    prn: "NEX-26-1035",
    firstName: "Isaac",
    lastName: "Tumusiime",
    otherNames: "",
    email: "isaac.tumusiime@example.com",
    phoneNumber: "+256 778 240 650",
    gender: "Male",
    dateOfBirth: "2005-09-06",
    nationality: "Ugandan",
    district: "Kabale",
    subcounty: "Northern",
    village: "Rugarama",
    programChoice1: "Bachelor of Tourism Management",
    programChoice2: "Bachelor of Business Administration",
    programChoice3: "Bachelor of Arts in Economics",
    studyMode: "Day",
    academicYear: "2026/2027",
    semester: "Semester 1",
    emailVerified: true,
    status: "SUBMITTED",
    reviewStatus: "Pending review",
    submittedAt: iso(35),
    reviewedAt: null,
    reviewerNotes: null,
    uceResult: '{"Mathematics":"B","English":"A","Geography":"A","History":"B"}',
    uaceResult: '{"Geography":"A","Economics":"B","General Paper":"A","points":13}',
    documents: '["National ID","UCE Certificate","UACE Certificate"]',
    extras: '{"scholarshipRequested":true,"accommodation":true}',
    feePaid: 50000,
    feeRequired: 50000,
    feeCurrency: "UGX",
    createdAt: iso(38),
    updatedAt: iso(35),
  },
];

const router: IRouter = Router();

function isAuthorized(req: Request) {
  const authorization = req.header("authorization");
  return authorization === `Bearer ${TOKEN}`;
}

function unauthorized(res: Response) {
  return res.status(401).json({ error: "Authentication required" });
}

router.post("/v1/admin/auth/login", (req, res) => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid email and password." });
  }

  if (
    parsed.data.email.toLowerCase() !== ADMIN.email ||
    parsed.data.password !== "admin123"
  ) {
    return res.status(401).json({ error: "Invalid administrator credentials." });
  }

  return res.json(AdminLoginResponse.parse({ ...ADMIN, token: TOKEN }));
});

router.get("/v1/admin/auth/me", (req, res) => {
  if (!isAuthorized(req)) return unauthorized(res);
  return res.json(GetAdminMeResponse.parse(ADMIN));
});

router.get("/v1/admin/dashboard/stats", (req, res) => {
  if (!isAuthorized(req)) return unauthorized(res);
  const count = (status: ApplicationStatus) =>
    applications.filter((application) => application.status === status).length;
  return res.json(
    GetAdminDashboardStatsResponse.parse({
      totalApplications: applications.length,
      pendingReview: count("SUBMITTED"),
      admitted: count("ADMITTED"),
      rejected: count("REJECTED"),
      waitlisted: count("WAITLISTED"),
      draft: count("DRAFT"),
      monthlyTrend: {
        "Mar 2026": 22,
        "Apr 2026": 31,
        "May 2026": 28,
        "Jun 2026": 44,
        "Jul 2026": 39,
        "Aug 2026": applications.length,
      },
    }),
  );
});

router.get("/v1/admin/applications/recent", (req, res) => {
  if (!isAuthorized(req)) return unauthorized(res);
  const parsed = GetAdminRecentApplicationsQueryParams.parse(req.query);
  const recent = applications
    .filter((application) => application.submittedAt)
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))
    .slice(0, parsed.limit);
  return res.json(GetAdminRecentApplicationsResponse.parse(recent));
});

router.get("/v1/admin/applications", (req, res) => {
  if (!isAuthorized(req)) return unauthorized(res);
  const parsed = GetAdminApplicationsQueryParams.parse(req.query);
  const search = parsed.search?.trim().toLowerCase();
  const filtered = applications.filter((application) => {
    const matchesStatus =
      parsed.status === "ALL" || application.status === parsed.status;
    const searchable = [
      application.prn,
      application.firstName,
      application.lastName,
      application.email,
      application.programChoice1,
    ]
      .join(" ")
      .toLowerCase();
    return matchesStatus && (!search || searchable.includes(search));
  });
  const start = parsed.page * parsed.size;
  return res.json(
    GetAdminApplicationsResponse.parse({
      content: filtered.slice(start, start + parsed.size),
      page: parsed.page,
      size: parsed.size,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / parsed.size)),
    }),
  );
});

router.get("/v1/admin/applications/:id", (req, res) => {
  if (!isAuthorized(req)) return unauthorized(res);
  const { id } = GetAdminApplicationParams.parse(req.params);
  const application = applications.find((item) => item.id === id);
  if (!application) return res.status(404).json({ error: "Application not found." });
  return res.json(GetAdminApplicationResponse.parse(application));
});

router.put("/v1/admin/applications/:id/review", (req, res) => {
  if (!isAuthorized(req)) return unauthorized(res);
  const { id } = ReviewAdminApplicationParams.parse(req.params);
  const body = ReviewAdminApplicationBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Choose a valid review decision." });
  }
  const application = applications.find((item) => item.id === id);
  if (!application) return res.status(404).json({ error: "Application not found." });
  if (application.status !== "SUBMITTED") {
    return res.status(400).json({ error: "Only submitted applications can be reviewed." });
  }

  const statusMap: Record<string, ApplicationStatus> = {
    admitted: "ADMITTED",
    rejected: "REJECTED",
    waitlisted: "WAITLISTED",
  };
  application.status = statusMap[body.data.reviewStatus];
  application.reviewStatus =
    body.data.reviewStatus.charAt(0).toUpperCase() +
    body.data.reviewStatus.slice(1);
  application.reviewerNotes = body.data.notes || null;
  application.reviewedAt = new Date().toISOString();
  application.updatedAt = application.reviewedAt;
  return res.json(ReviewAdminApplicationResponse.parse(application));
});

export default router;