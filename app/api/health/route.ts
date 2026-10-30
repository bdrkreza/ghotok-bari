/** Uptime check for the host; it never touches the database. */
export function GET() {
  return Response.json({ ok: true, app: "alta" });
}
