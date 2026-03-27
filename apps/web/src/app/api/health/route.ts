export async function GET() {
  return Response.json({
    ok: true,
    service: "web",
    message: "TriageAI web scaffold is up",
  });
}
