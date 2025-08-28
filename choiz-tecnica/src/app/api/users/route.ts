import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/app/lib/supabaseClient";
import { validateRole } from "@/app/lib/middlewares";

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
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional ID of the user to fetch (only available to ADMIN and DOCTOR roles)
 *       - in: query
 *         name: doctor_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional ID of the doctor to filter by (only available to ADMIN role)
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
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const doctor_id = url.searchParams.get("doctor_id");
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const { data: user, error } = await supabase.auth.getUser(token);

    if (error || !user.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    

    const { data: usuario } = await supabaseAdmin.from("usuario").select("*").eq("id_usuario", user.user.id).single();


    let query = supabaseAdmin.from("usuario").select("*");

    if (usuario.rol == "USER") {
        return NextResponse.json({ usuario });
    }
    if (user_id) query = query.eq("id_usuario", user_id);
    if (usuario.rol == "ADMIN" && doctor_id) {
        query = query.eq("doctor_id", doctor_id);
    } else if (usuario.rol == "DOCTOR") {
        query = query.eq("doctor_id", usuario.id_usuario);
    }
    const { data: usuarios, error: dataError } = await query;
    if (dataError) return NextResponse.json({ error: dataError.message }, { status: 500 });

    return NextResponse.json({ usuarios });

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

    try {
        await validateRole(body.rol);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

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
