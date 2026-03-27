export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonErrorResponse(error: unknown, fallbackMessage = "Something went wrong.") {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return Response.json({ error: fallbackMessage }, { status: 500 });
}
