import {supabase} from "@/app/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type Role = "USER" | "DOCTOR" | "ADMIN";

async function validateRole(rol: string) {
  const { data: validRoles } = await supabase.from("rol").select("rol");
  if (!validRoles?.some(r => r.rol === rol)) {
    throw new Error("Invalid role");
  }
}

function requireRole(allowedRoles: Role[]) {
  return (handler: (req: Request, ctx: { user: any }) => Promise<Response>) => 
    async (req: Request, ctx: { user: any }) => {
      const user = ctx.user;
      if (!user || !allowedRoles.includes(user.rol as Role)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
      }
      return handler(req, ctx);
  };
}


export { validateRole,requireRole};

