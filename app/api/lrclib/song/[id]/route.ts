import { getSongById, LrclibRequestError } from "@/lib/lrclib";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const song = await getSongById(id);
    return Response.json({ song });
  } catch (error) {
    const status =
      error instanceof LrclibRequestError && error.status === 504 ? 504 : 503;

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load this LRCLIB song.",
      },
      { status },
    );
  }
}
