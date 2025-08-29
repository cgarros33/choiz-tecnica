import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/app/lib/supabaseClient';



/**
 * @openapi
 * /api/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns a JWT access token.
 *     requestBody:
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
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Successful login returns JWT and user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 refresh_token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id_usuario:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid email or password
 */


/* export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  
  return NextResponse.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    user: {
      id_usuario: data.user.id,
      email: data.user.email,
    },
  });
}
 */

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // First authenticate
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Invalid login" }, { status: 401 });
  }

  // Fetch full user from your usuario table
  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuario")
    .select("*")
    .eq("id_usuario", data.user.id)
    .single();

  if (usuarioError) {
    return NextResponse.json({ error: usuarioError.message }, { status: 500 });
  }

  return NextResponse.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    usuario, // return full row from usuario table
  });
}
