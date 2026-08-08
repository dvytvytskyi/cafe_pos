export async function register() {
  // Background workers (Veri*Factu queue, DB backup) use Node-only APIs (child_process, pg_dump).
  // They are started via API-side queue subscribers / dev:ws — not via instrumentation,
  // to avoid pulling server modules into the Next.js client bundle.
}
