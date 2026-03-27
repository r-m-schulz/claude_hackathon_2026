import { requireAuthUser } from "@/lib/server/businessAuth";
import { jsonErrorResponse } from "@/lib/server/http";
import { getBusinessWorkspaceByAuthUserId } from "@/lib/server/businessWorkspace";

export async function GET(req: Request) {
  try {
    const user = await requireAuthUser(req);
    const workspace = await getBusinessWorkspaceByAuthUserId(user.id);
    return Response.json(workspace);
  } catch (error) {
    return jsonErrorResponse(error, "Unable to load the business workspace.");
  }
}
