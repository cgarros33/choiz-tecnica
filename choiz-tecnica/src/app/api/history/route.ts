import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/app/lib/supabaseClient";
import { requireRole } from "@/app/lib/middlewares";
interface Pregunta {
    pregunta: string;
    value: string;
}
/**
 * @openapi
 * /api/history:
 *   post:
 *     summary: Insert preguntas for authenticated user
 *     description: Inserts an array of medical questions for the logged-in user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preguntas_medicas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - pregunta
 *                     - value
 *                   properties:
 *                     pregunta:
 *                       type: string
 *                     value:
 *                       type: string
 *     responses:
 *       200:
 *         description: Questions inserted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const { data: session, error: sessionError } = await supabase.auth.getUser(token);
    if (sessionError || !session.user) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = session.user.id;

    console.log(userId);

    const { data: user, error: userError } = await supabaseAdmin.from("usuario").select("*").eq("id_usuario", userId).single();
    if (userError || !user) {
        console.log(userError);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.rol !== "USER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const preguntas: Pregunta[] = body.preguntas_medicas;
    if (!Array.isArray(preguntas) || preguntas.length === 0) {
        return NextResponse.json({ error: "No preguntas provided" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("preguntas").insert(
        preguntas.map(p => ({
            pregunta: p.pregunta,
            value: p.value,
            id_usuario: userId,
        }))
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: "Preguntas inserted", data });
}
/**
 * @openapi
 * /api/history:
 *   get:
 *     summary: Get medical questions  with role-based filtering
 *     description: Retrieves medical questions depending on the authenticated user's role.
 *       - USER sees only their own questions
 *       - DOCTOR sees questions for patients assigned to them (optionally filtered by `doctor_id`)
 *       - ADMIN sees all questions (optionally filtered by `user_id` or `doctor_id`)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter questions by user ID (ADMIN only)
 *       - in: query
 *         name: doctor_id
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter questions by doctor ID (ADMIN or DOCTOR)
 *     responses:
 *       200:
 *         description: Successful response with questions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preguntas_medicas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       pregunta:
 *                         type: string
 *                         example: "Ha experimentado fiebre en los ultimos 7 dias?"
 *                       value:
 *                         type: string
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const doctor_id = url.searchParams.get("doctor_id");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);
    if (sessionError || !sessionData.user) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = sessionData.user.id;

    const { data: usuario, error: usuarioError } = await supabaseAdmin
        .from("usuario")
        .select("*")
        .eq("id_usuario", userId)
        .single();
    if (usuarioError || !usuario) return NextResponse.json({ error: "User not found" }, { status: 404 });

    /* let query = supabaseAdmin.from("preguntas").select("pregunta, value");

    if (usuario.rol === "USER") {
        query = query.eq("id_usuario", usuario.id_usuario);
    } else if (usuario.rol === "DOCTOR") {
        query = query.eq("id_usuario", doctor_id ? doctor_id : usuario.id_usuario);
    } else if (usuario.rol === "ADMIN") {
        if (user_id) query = query.eq("id_usuario", user_id);
        if (doctor_id) query = query.eq("doctor_id", doctor_id);
    } */
    /* 
        let query = supabaseAdmin
            .from("preguntas")
            .select(`
        pregunta,
        value,
        usuario (
          doctor_id
        )
      `);
    
        if (usuario.rol === "USER") {
            query = query.eq("id_usuario", usuario.id_usuario);
        } else if (usuario.rol === "DOCTOR") {
            // filter preguntas where usuario.doctor_id = this doctor
            console.log(usuario.id_usuario);
            query = query.eq("usuario.doctor_id", usuario.id_usuario);
        } else if (usuario.rol === "ADMIN") {
            if (user_id) query = query.eq("id_usuario", user_id);
            if (doctor_id) query = query.eq("usuario.doctor_id", doctor_id);
        }
    
    
        const { data: preguntas_medicas, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
        const filtered = preguntas_medicas?.map(p => ({
            pregunta: p.pregunta,
            value: p.value,
        }));
    
        return NextResponse.json({ "preguntas_medicas":filtered }); */

    let query = supabaseAdmin.from("preguntas").select("pregunta, value");

    // USER → only their own preguntas
    if (usuario.rol === "USER") {
        query = query.eq("id_usuario", usuario.id_usuario);
    }

    // DOCTOR → preguntas of patients assigned to them
    else if (usuario.rol === "DOCTOR") {
        // subquery: get id_usuario of patients with doctor_id = doctor UID
        const { data: patientIds, error: patientError } = await supabaseAdmin
            .from("usuario")
            .select("id_usuario")
            .eq("doctor_id", usuario.id_usuario);

        if (patientError) return NextResponse.json({ error: patientError.message }, { status: 500 });

        const ids = patientIds?.map(p => p.id_usuario) || [];
        query = query.in("id_usuario", ids);
    }

    else if (usuario.rol === "ADMIN") {
        if (user_id) query = query.eq("id_usuario", user_id);
        else if (doctor_id) {
            const { data: patientIds, error: patientError } = await supabaseAdmin
                .from("usuario")
                .select("id_usuario")
                .eq("doctor_id", doctor_id);

            if (patientError) return NextResponse.json({ error: patientError.message }, { status: 500 });

            const ids = patientIds?.map(p => p.id_usuario) || [];
            query = query.in("id_usuario", ids);
        }
    }

    const { data: preguntas_medicas, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const filtered = preguntas_medicas?.map(p => ({
        pregunta: p.pregunta,
        value: p.value,
    }));

    return NextResponse.json({ preguntas_medicas: filtered });




}





/* export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  const { data: session, error: sessionError } = await supabase.auth.getUser(token);
  if (sessionError || !session.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { data: preguntas_medicas, error } = await supabaseAdmin
    .from("preguntas")
    .select("pregunta, value")
    .eq("id_usuario", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preguntas_medicas });
}
 */