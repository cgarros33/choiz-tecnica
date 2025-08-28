import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/app/lib/supabaseClient";


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
 *               - nombre
 *               - apellido
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *               nombre:
 *                 type: string
 *                 example: Usuario
 *               apellido:
 *                 type: string
 *                 example: Generico
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *                 example: 2001-01-01
 *               direccion:
 *                 type: string
 *                 example: Direccion Generica 1234
 *               rol:
 *                 type: string
 *                 example: USER
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
 */


export async function POST(req: NextRequest) {
    const body = await req.json();
    const { email, password } = body;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.user) {
        return NextResponse.json({ error: "User not created" }, { status: 500 });
    }

    const { error: usuarioError } = await supabaseAdmin.from("usuario").insert({
        id_usuario: data.user.id,
        email: data.user.email,
        nombre: body.nombre || "Usuario",
        apellido: body.apellido || "Generico",
        fecha_nacimiento: body.fecha_nacimiento || "2001-01-01",
        direccion: body.direccion || "Direccion Generica 1234",
        rol: body.rol || "USER",
    });


    if (usuarioError) {
        return NextResponse.json({ error: usuarioError.message }, { status: 500 });
    }

    const { data: usuario } = await supabaseAdmin.from("usuario").select("*").eq("id_usuario", data.user.id).single();

    return NextResponse.json({
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        user: usuario,
    });
}
