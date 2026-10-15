import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Crown,
  Users,
  CalendarRange,
  Coins,
  Search,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { debugLog, debugWarn, traceApiError } from "@/lib/debug";

const NAP_API = API_BASE_URL;

type SchemeProgram = {
  id: number;
  programName: string;
  programCode: string;
  programType: string;
};
type AdmissionScheme = {
  id: number;
  schemeName: string;
  category: string;
  academicYear: string;
  intakeMonth: string;
  description: string;
  appOpenDate: string | null;
  appCloseDate: string | null;
  capacity: number | null;
  applicationFees: string;
  serviceFee: number | null;
  status: string;
  daysLeft: number | null;
  programCount: number;
  programs: SchemeProgram[];
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};

type Program = {
  id: number;
  programName: string;
  programCode: string;
  programType: string;
  status: string;
};

const AWARD_ORDER = ["BACHELOR", "DIPLOMA", "CERTIFICATE", "MASTER", "PHD"];
const AWARD_LABELS: Record<string, string> = {
  BACHELOR: "Bachelor Degrees",
  DIPLOMA: "Diplomas",
  CERTIFICATE: "Certificates",
  MASTER: "Master Degrees",
  PHD: "Doctorates (PhD)",
};

function awardTypeForScheme(programType: string | undefined) {
  const normalized = (programType || "BACHELOR").trim().toUpperCase();
  return normalized === "UNDERGRADUATE" ? "BACHELOR" : normalized;
}
const ACADEMIC_YEARS = ["2025/2026", "2026/2027", "2027/2028", "2028/2029"];
const INTAKE_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function formatUGX(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return "UGX " + Number(n).toLocaleString("en-US");
}

function statusColor(s: string) {
  if (s === "OPEN") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "SCHEDULED") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function toLocalDT(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDT(v: string) {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00` : v;
}

export default function SchemesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<AdmissionScheme | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    data: schemes = [],
    isLoading,
    error: schemesError,
    status: schemesStatus,
  } = useQuery({
    queryKey: ["admin-schemes"],
    queryFn: () =>
      customFetch<AdmissionScheme[]>(`${NAP_API}/api/v1/admin/schemes`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch(`${NAP_API}/api/v1/admin/schemes/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, id) => {
      debugLog("[SCHEMES] delete accepted", { id });
      queryClient.invalidateQueries({ queryKey: ["admin-schemes"] });
    },
    onError: (err) => traceApiError("[SCHEMES] delete failed", err),
  });

  const filtered = schemes.filter(
    (s) => !search || s.schemeName.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    debugLog("[SCHEMES] mounted — listing from", `${NAP_API}/api/v1/admin/schemes`);
    return () => debugLog("[SCHEMES] unmounted");
  }, []);

  // Log once per real load, not per render.
  const schemesState = `${schemesStatus}:${schemes.length}`;
  const prevSchemesState = useRef(schemesState);
  useEffect(() => {
    if (prevSchemesState.current === schemesState) return;
    const previous = prevSchemesState.current;
    prevSchemesState.current = schemesState;
    debugLog("[SCHEMES] list loaded", {
      previous,
      result: { status: schemesStatus, schemes: schemes.length },
      url: `${NAP_API}/api/v1/admin/schemes`,
    });
  }, [schemesState, schemesStatus, schemes.length]);

  useEffect(() => {
    if (schemesError) traceApiError("[SCHEMES] list schemes", schemesError);
  }, [schemesError]);

  const schemesListState = `${search}|${filtered.length}|${schemes.length}`;
  const prevSchemesListState = useRef(schemesListState);
  useEffect(() => {
    if (prevSchemesListState.current === schemesListState) return;
    const previous = prevSchemesListState.current;
    prevSchemesListState.current = schemesListState;
    debugLog("[SCHEMES] search / visible set changed", {
      previous,
      search: search || null,
      matched: filtered.length,
      ofTotal: schemes.length,
      // A search that matches nothing is usually the confusing case.
      ...(search && filtered.length === 0 ? { note: "search matched no schemes" } : {}),
    });
  }, [schemesListState, search, filtered.length, schemes.length]);

  const fees = (raw: string) => parseJson<Record<string, number>>(raw, {});

  if (showForm) {
    return (
      <SchemeForm
        scheme={editing}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="nexus-serif text-2xl font-bold">Admission Schemes</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage the running admissions windows shown on the public
            application portal. Open a scheme to invite applications for any
            programme(s).
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            debugLog("[SCHEMES] open new scheme form");
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus size={14} className="mr-1" /> New Scheme
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schemes..."
            className="pl-9"
          />
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] font-medium self-center">
          {filtered.length} of {schemes.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="nexus-card rounded-2xl border p-12 text-center">
          <Megaphone size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            No admission schemes yet. Click <strong>New Scheme</strong> to open
            applications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const feeList = fees(s.applicationFees);
            const isOpen = s.status === "OPEN";
            return (
              <div
                key={s.id}
                className="nexus-card rounded-2xl border overflow-hidden"
              >
                <button
                  onClick={() => {
                    const next = expandedId === s.id ? null : s.id;
                    debugLog("[SCHEMES] expand toggle", {
                      schemeId: s.id,
                      schemeName: s.schemeName,
                      action: next === null ? "collapse" : "expand",
                    });
                    setExpandedId(next);
                  }}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-[hsl(var(--muted)/.3)] transition-colors cursor-pointer"
                >
                  <div
                    className={`shrink-0 flex size-11 items-center justify-center rounded-xl ${isOpen ? "bg-emerald-100 text-emerald-700" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"}`}
                  >
                    {isOpen ? (
                      <Megaphone size={20} />
                    ) : (
                      <CalendarRange size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">
                        {s.schemeName}
                      </h3>
                      {s.category && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {s.category}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(s.status)}`}
                      >
                        {s.status}
                      </span>
                      {isOpen && s.daysLeft != null && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {s.daysLeft === 0
                            ? "Closing today"
                            : `${s.daysLeft} day(s) left`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarRange size={12} /> {s.academicYear || "—"} ·{" "}
                        {s.intakeMonth || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {s.programCount} programme(s)
                      </span>
                      {s.capacity != null && <span>Capacity {s.capacity}</span>}
                      <span className="flex items-center gap-1">
                        <Coins size={12} /> {formatUGX(feeList.ugandan)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        debugLog("[SCHEMES] open edit form", {
                          schemeId: s.id,
                          schemeName: s.schemeName,
                          programCount: s.programs?.length ?? 0,
                        });
                        setEditing(s);
                        setShowForm(true);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete scheme "${s.schemeName}"?`)) {
                          debugLog("[SCHEMES] delete cancelled", {
                            schemeId: s.id,
                            schemeName: s.schemeName,
                          });
                          return;
                        }
                        debugLog("[SCHEMES] delete requested", {
                          schemeId: s.id,
                          schemeName: s.schemeName,
                          programsAttached: s.programs?.length ?? 0,
                        });
                        deleteMutation.mutate(s.id);
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                    {expandedId === s.id ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                </button>
                {expandedId === s.id && (
                  <div className="border-t border-[hsl(var(--border))] p-5 space-y-5 bg-[hsl(var(--muted)/.1)]">
                    {s.description && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {s.description}
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1">
                          <Coins size={12} /> Application Fees
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Ugandan
                            </span>
                            <span className="font-semibold">
                              {formatUGX(feeList.ugandan)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              East African
                            </span>
                            <span className="font-semibold">
                              {formatUGX(feeList.eastAfrican)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Non East African
                            </span>
                            <span className="font-semibold">
                              {formatUGX(feeList.nonEastAfrican)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-[hsl(var(--border)/.6)] pt-1.5">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Service fee
                            </span>
                            <span className="font-semibold">
                              {formatUGX(s.serviceFee)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1">
                          <CalendarRange size={12} /> Window
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Opens
                            </span>
                            <span className="font-medium">
                              {s.appOpenDate
                                ? new Date(s.appOpenDate).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Closes
                            </span>
                            <span className="font-medium">
                              {s.appCloseDate
                                ? new Date(s.appCloseDate).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[hsl(var(--muted-foreground))]">
                              Capacity
                            </span>
                            <span className="font-medium">
                              {s.capacity ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1">
                          <Crown size={12} /> Programmes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.programs.length ? (
                            s.programs.map((p) => (
                              <span
                                key={p.id}
                                className="px-2 py-0.5 rounded-full bg-white border border-[hsl(var(--border))] text-[11px]"
                              >
                                {p.programName}
                              </span>
                            ))
                          ) : (
                            <span className="text-[hsl(var(--muted-foreground))]">
                              No programmes attached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SchemeForm({
  scheme,
  onClose,
}: {
  scheme: AdmissionScheme | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const {
    data: programs = [],
    error: programsError,
    status: programsStatus,
  } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: () => customFetch<Program[]>(`${NAP_API}/api/v1/admin/programs`),
  });

  const existingFees = parseJson<Record<string, number>>(
    scheme?.applicationFees,
    {},
  );

  const [form, setForm] = useState({
    schemeName: scheme?.schemeName || "",
    category: scheme?.category || "",
    academicYear: scheme?.academicYear || "",
    intakeMonth: scheme?.intakeMonth || "",
    description: scheme?.description || "",
    appOpenDate: toLocalDT(scheme?.appOpenDate),
    appCloseDate: toLocalDT(scheme?.appCloseDate),
    capacity: scheme?.capacity != null ? String(scheme.capacity) : "",
    serviceFee: scheme?.serviceFee != null ? String(scheme.serviceFee) : "",
    ugandan: existingFees.ugandan != null ? String(existingFees.ugandan) : "",
    eastAfrican:
      existingFees.eastAfrican != null ? String(existingFees.eastAfrican) : "",
    nonEastAfrican:
      existingFees.nonEastAfrican != null
        ? String(existingFees.nonEastAfrican)
        : "",
    status: scheme?.status || "OPEN",
  });
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    (scheme?.programs || []).map((p) => p.id),
  );
  const [programSearch, setProgramSearch] = useState("");

  const grouped = AWARD_ORDER.map((award) => ({
    award,
    label: AWARD_LABELS[award],
    options: programs.filter(
      (p) =>
        awardTypeForScheme(p.programType) === award && p.status === "Active",
    ),
  })).filter((g) => g.options.length > 0);

  const set = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    debugLog("[SCHEMES] form mounted", {
      mode: scheme ? "edit" : "create",
      schemeId: scheme?.id ?? null,
      schemeName: scheme?.schemeName ?? null,
      preselectedPrograms: scheme?.programs?.length ?? 0,
    });
    return () => debugLog("[SCHEMES] form unmounted", {
      schemeId: scheme?.id ?? null,
    });
  }, [scheme]);

  // Log once per real load, not per render.
  const programsState = `${programsStatus}:${programs.length}`;
  const prevProgramsState = useRef(programsState);
  useEffect(() => {
    if (prevProgramsState.current === programsState) return;
    const previous = prevProgramsState.current;
    prevProgramsState.current = programsState;
    debugLog("[SCHEMES] programmes loaded", {
      previous,
      result: { status: programsStatus, programmes: programs.length },
      url: `${NAP_API}/api/v1/admin/programs`,
    });
  }, [programsState, programsStatus, programs.length]);

  useEffect(() => {
    if (programsError)
      traceApiError("[SCHEMES] list programmes for picker", programsError);
  }, [programsError]);

  // The picker silently hides programmes that are inactive or whose
  // programType maps to no AWARD_ORDER group - log what it is showing and
  // what got dropped so a scheme can never be saved against a short list.
  const groupedState = grouped
    .map((g) => `${g.award}:${g.options.length}`)
    .join("|");
  const prevGroupedState = useRef(groupedState);
  useEffect(() => {
    if (prevGroupedState.current === groupedState) return;
    const previous = prevGroupedState.current;
    prevGroupedState.current = groupedState;

    const groupedIds = new Set(grouped.flatMap((g) => g.options.map((o) => o.id)));
    const hidden = programs.filter((p) => !groupedIds.has(p.id));
    debugLog("[SCHEMES] picker grouped", {
      previous,
      groups: grouped.map((g) => ({
        award: g.award,
        label: g.label,
        programmes: g.options.length,
      })),
      totalLoaded: programs.length,
      ...(hidden.length
        ? {
            note: "programmes loaded but NOT selectable",
            hidden: hidden.map((p) => ({
              id: p.id,
              code: p.programCode,
              programType: p.programType,
              status: p.status,
              mapsTo: awardTypeForScheme(p.programType),
              reason:
                p.status !== "Active"
                  ? "not Active"
                  : !AWARD_ORDER.includes(
                        awardTypeForScheme(p.programType) as (typeof AWARD_ORDER)[number],
                      )
                    ? "no award group"
                    : "filtered",
            })),
          }
        : {}),
    });
  }, [groupedState, grouped, programs.length]);

  const toggleProgram = (id: number) => {
    const program = programs.find((p) => p.id === id);
    debugLog("[SCHEMES] programme toggle", {
      id,
      programCode: program?.programCode ?? "(not loaded)",
      action: selectedIds.includes(id) ? "deselect" : "select",
      selectedAfter: selectedIds.includes(id)
        ? selectedIds.length - 1
        : selectedIds.length + 1,
    });
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const body = JSON.stringify(data);
      if (scheme?.id)
        return customFetch(`${NAP_API}/api/v1/admin/schemes/${scheme.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
      return customFetch(`${NAP_API}/api/v1/admin/schemes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    },
    onSuccess: (data: unknown) => {
      debugLog("[SCHEMES] save accepted", {
        mode: scheme ? "edit" : "create",
        schemeId: scheme?.id ?? null,
        method: scheme?.id ? "PUT" : "POST",
        url: scheme?.id
          ? `${NAP_API}/api/v1/admin/schemes/${scheme.id}`
          : `${NAP_API}/api/v1/admin/schemes`,
        response: data,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-schemes"] });
      showToast(
        scheme ? "Scheme updated successfully" : "Scheme created successfully",
      );
      setTimeout(onClose, 700);
    },
    onError: (err) =>
      traceApiError(
        `[SCHEMES] save failed (${scheme ? "PUT" : "POST"})`,
        err,
      ),
  });

  const handleSubmit = () => {
    const applicationFees = JSON.stringify({
      ugandan: Number(form.ugandan) || 0,
      eastAfrican: Number(form.eastAfrican) || 0,
      nonEastAfrican: Number(form.nonEastAfrican) || 0,
    });

    // Cross-check the selection against the picker: a save that silently drops
    // programmes the admin could not see is the failure mode worth catching.
    const selectableIds = new Set(
      grouped.flatMap((g) => g.options.map((o) => o.id)),
    );
    const notSelectable = selectedIds.filter((id) => !selectableIds.has(id));
    if (notSelectable.length) {
      debugWarn("[SCHEMES] save includes programmes not offered by the picker", {
        count: notSelectable.length,
        programIds: notSelectable,
        note: "usually means those programmes became inactive since the form opened",
      });
    }

    const payload = {
      schemeName: form.schemeName,
      category: form.category,
      academicYear: form.academicYear,
      intakeMonth: form.intakeMonth,
      description: form.description,
      appOpenDate: fromLocalDT(form.appOpenDate),
      appCloseDate: fromLocalDT(form.appCloseDate),
      capacity: form.capacity ? Number(form.capacity) : null,
      applicationFees,
      serviceFee: form.serviceFee ? Number(form.serviceFee) : 0,
      status: form.status,
      programIds: selectedIds,
    };

    const closeAfterOpen = form.appCloseDate
      ? new Date(form.appCloseDate)
      : null;
    const openAfterClose =
      closeAfterOpen && !Number.isNaN(closeAfterOpen.getTime())
        ? new Date(form.appOpenDate) > closeAfterOpen
        : false;

    debugLog("[SCHEMES] save requested", {
      mode: scheme ? "edit" : "create",
      method: scheme?.id ? "PUT" : "POST",
      payload: {
        ...payload,
        description:
          form.description.length > 80
            ? `${form.description.slice(0, 80)}...`
            : form.description,
      },
      validation: {
        hasName: Boolean(form.schemeName),
        programmeCount: selectedIds.length,
        ...(openAfterClose ? { note: "appCloseDate is before appOpenDate" } : {}),
      },
    });

    saveMutation.mutate(payload);
  };

  const required = Boolean(form.schemeName) && selectedIds.length > 0;

  const matchesProgramSearch = (p: Program) => {
    const query = programSearch.trim().toLowerCase();
    return (
      !query ||
      p.programName.toLowerCase().includes(query) ||
      p.programCode.toLowerCase().includes(query)
    );
  };
  const visibleProgramCount = grouped.reduce(
    (n, g) => n + g.options.filter(matchesProgramSearch).length,
    0,
  );

  const programSearchState = `${programSearch}|${visibleProgramCount}`;
  const prevProgramSearchState = useRef(programSearchState);
  useEffect(() => {
    if (prevProgramSearchState.current === programSearchState) return;
    const previous = prevProgramSearchState.current;
    prevProgramSearchState.current = programSearchState;
    debugLog("[SCHEMES] programme search changed", {
      previous,
      query: programSearch || null,
      visible: visibleProgramCount,
      selectable: grouped.reduce((n, g) => n + g.options.length, 0),
      ...(programSearch && visibleProgramCount === 0
        ? { note: "no programmes match this search" }
        : {}),
    });
  }, [programSearchState, programSearch, visibleProgramCount]);

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg animate-in fade-in slide-in-from-top-4">
          <Check size={16} /> {toast}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            debugWarn("[SCHEMES] form abandoned", {
              schemeId: scheme?.id ?? null,
              schemeName: form.schemeName || null,
              programmesSelected: selectedIds.length,
              note: "changes discarded",
            });
            onClose();
          }}
        >
          <X size={16} />
        </Button>
        <div>
          <h1 className="nexus-serif text-2xl font-bold">
            {scheme ? "Edit Scheme" : "New Admission Scheme"}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Configure a running admissions window and pick which programme(s) it
            applies to.
          </p>
        </div>
      </div>

      <div className="nexus-card rounded-2xl border p-6 space-y-4">
        <Field
          label="Scheme Name"
          value={form.schemeName}
          onChange={(v) => set("schemeName", v)}
          placeholder="e.g. Undergraduate Admissions 2026/27"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Category / Award"
            value={form.category}
            onChange={(v) => set("category", v)}
            options={AWARD_ORDER}
          />
          <SelectField
            label="Academic Year"
            value={form.academicYear}
            onChange={(v) => set("academicYear", v)}
            options={ACADEMIC_YEARS}
          />
          <SelectField
            label="Intake Month"
            value={form.intakeMonth}
            onChange={(v) => set("intakeMonth", v)}
            options={INTAKE_MONTHS}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm min-h-[70px]"
            placeholder="Short description shown on the public portal..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">
              Application Opens
            </label>
            <input
              type="datetime-local"
              value={form.appOpenDate}
              onChange={(e) => set("appOpenDate", e.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">
              Application Closes
            </label>
            <input
              type="datetime-local"
              value={form.appCloseDate}
              onChange={(e) => set("appCloseDate", e.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label="Capacity"
            value={form.capacity}
            onChange={(v) => set("capacity", v.replace(/\D/g, ""))}
            type="number"
            placeholder="e.g. 500"
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => set("status", v)}
            options={["OPEN", "SCHEDULED", "CLOSED"]}
          />
          <Field
            label="Service Fee (UGX)"
            value={form.serviceFee}
            onChange={(v) => set("serviceFee", v.replace(/\D/g, ""))}
            type="number"
            placeholder="e.g. 5000"
          />
        </div>

        <div className="rounded-xl bg-[hsl(var(--muted)/.35)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-3 flex items-center gap-1">
            <Coins size={12} /> Application Fees (UGX) per region
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Ugandan"
              value={form.ugandan}
              onChange={(v) => set("ugandan", v.replace(/\D/g, ""))}
              type="number"
              placeholder="e.g. 50000"
            />
            <Field
              label="East African"
              value={form.eastAfrican}
              onChange={(v) => set("eastAfrican", v.replace(/\D/g, ""))}
              type="number"
              placeholder="e.g. 50000"
            />
            <Field
              label="Non East African"
              value={form.nonEastAfrican}
              onChange={(v) => set("nonEastAfrican", v.replace(/\D/g, ""))}
              type="number"
              placeholder="e.g. 151500"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-3 block">
            Select Programme(s){" "}
            <span className="text-[hsl(var(--primary))]">*</span>
          </p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] -mt-2 mb-3">
            Grouped by award type.{" "}
            {selectedIds.length > 0
              ? `${selectedIds.length} selected.`
              : "Choose at least one programme."}
          </p>
          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
            />
            <Input
              value={programSearch}
              onChange={(e) => setProgramSearch(e.target.value)}
              placeholder="Search programmes by name or code..."
              aria-label="Search programmes"
              className="pl-9 text-sm"
            />
          </div>
          <div className="space-y-4">
            {grouped.map((g) => (
              <div
                key={g.award}
                className="border border-[hsl(var(--border))] rounded-xl overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-[hsl(var(--muted)/.35)] text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                  <span>{g.label}</span>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    {g.options.length} available ·{" "}
                    {g.options.filter((p) => selectedIds.includes(p.id)).length}{" "}
                    selected
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                  {g.options
                    .filter(matchesProgramSearch)
                    .map((p) => {
                      const checked = selectedIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProgram(p.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${checked ? "bg-[hsl(var(--primary)/.12)] text-[hsl(var(--foreground))]" : "hover:bg-[hsl(var(--muted)/.5)]"}`}
                        >
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center rounded border ${checked ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white" : "border-[hsl(var(--border))]"}`}
                          >
                            {checked && <Check size={11} />}
                          </span>
                          <span className="truncate">{p.programName}</span>
                          {p.programCode && (
                            <span className="ml-auto text-[10px] font-mono bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded shrink-0">
                              {p.programCode}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                No active programmes found to attach.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!required || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="animate-spin" size={14} />
          ) : null}
          {scheme ? "Update Scheme" : "Create Scheme"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}: {
  label: string;
  value: unknown;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">
        {label}
        {required && " *"}
      </label>
      <Input
        type={type}
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">
        {label}
        {required && " *"}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
