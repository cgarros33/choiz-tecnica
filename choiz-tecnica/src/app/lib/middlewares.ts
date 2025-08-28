import {supabase} from "@/app/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type Role = "USER" | "DOCTOR" | "ADMIN";

async function validateRole(rol: string) {
  const { data: validRoles } = await supabase.from("rol").select("rol");
  if (!validRoles?.some(r => r.rol === rol)) {
    throw new Error("Invalid role");
  }
}


export { validateRole };

