import { connection } from "next/server";
import { getDb } from "@/db";

/** Docker HEALTHCHECK endpoint: succeeds when the database can be queried. */
export async function GET() {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  try {
    getDb().$client.prepare("select 1").get();
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ status: "error" }, { status: 503, headers });
  }
}
