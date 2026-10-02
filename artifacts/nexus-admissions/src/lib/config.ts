/**
 * Base URLs for the two backends this dashboard talks to.
 *
 * NAP (port 8080 in dev)  -> the main Nexus Application Portal backend.
 *   Serves /api/v1/admin/programs, /admin/schemes, /admin/program-categories
 *   and /api/v1/notifications* used by ProgramsPage, SchemesPage,
 *   CategoriesPage and useNotifications.
 *
 * NAD (port 8083 in dev)  -> the admissions backend.
 *   Serves /api/v1/admin/partners, /admin/gallery, /admin/student-stories and
 *   the customFetch client base. Requires an admin token (401/403 otherwise).
 *
 * Both fall back to localhost so local development needs no env file.
 */
const nap = import.meta.env.VITE_NAP_API_BASE_URL as string | undefined;
const nad = import.meta.env.VITE_NAD_API_BASE_URL as string | undefined;

const trim = (value: string | undefined, fallback: string) =>
  (value && value.trim() ? value.trim() : fallback).replace(/\/+$/, '');

export const API_BASE_URL = trim(nap, 'http://localhost:8080');
export const NAD_API_BASE_URL = trim(nad, 'http://localhost:8083');