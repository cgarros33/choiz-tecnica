import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";


/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get authenticated user info
 *     description: Retrieves information about the authenticated user based on the provided JWT token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response with user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Authenticated
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id_usuario:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid token
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  const { data: user, error } = await supabase.auth.getUser(token);

  if (error || !user.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  // Optionally fetch full usuario row
  const { data: usuario } = await supabase.from("usuario").select("*").eq("id_usuario", user.user.id).single();

  return NextResponse.json({ message: "Authenticated", usuario });
}

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with the provided email and password.
 *     requestBody:
 *       description: User registration details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example:
 *
  */
 
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    user: data.user,
  });
}
