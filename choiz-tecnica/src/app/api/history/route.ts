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
    if (user.doctor_id === null) {
        const { data: doctors, error: docError } = await supabaseAdmin
            .from("usuario")
            .select("id_usuario")
            .eq("rol", "DOCTOR");

        if (docError || !doctors?.length) {
            throw new Error("No doctors available");
        }

        const doctorPatientCounts: { id_usuario: string; patient_count: number }[] = [];
        for (const doctor of doctors) {
            const { data: patients, error: patErr } = await supabaseAdmin
                .from("usuario")
                .select("id_usuario")
                .eq("doctor_id", doctor.id_usuario);
            doctorPatientCounts.push({
                id_usuario: doctor.id_usuario,
                patient_count: patients ? patients.length : 0,
            });
        }
        const minCount = Math.min(...doctorPatientCounts.map(d => d.patient_count));
        const leastLoaded = doctorPatientCounts.filter(d => d.patient_count === minCount);
        const randomDoctor = leastLoaded[Math.floor(Math.random() * leastLoaded.length)];
        await supabaseAdmin
            .from("usuario")
            .update({ doctor_id: randomDoctor.id_usuario })
            .eq("id_usuario", userId);
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
 *     summary: Get medical questions with role-based filtering
 *     description: |
 *       Retrieves medical questions depending on the authenticated user's role:
 *       - USER sees only their own questions
 *       - DOCTOR sees questions for patients assigned to them (optionally filtered by `doctor-id` or `user-name`)
 *       - ADMIN sees all questions (optionally filtered by `user-id`, `doctor-id`, `user-name`, or `doctor-name`)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user-id
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter questions by user ID (ADMIN only)
 *       - in: query
 *         name: doctor-id
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter questions by doctor ID (ADMIN or DOCTOR)
 *       - in: query
 *         name: user-name
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter questions by partial match on user full name (ADMIN or DOCTOR)
 *       - in: query
 *         name: doctor-name
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter questions by partial match on doctor full name (ADMIN only)
 *     responses:
 *       200:
 *         description: Successful response with questions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       nombre:
 *                         type: string
 *                         example: "nombre"
 *                       preguntas_medicas:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             pregunta:
 *                               type: string
 *                               example: "respuesta"
 *                             value:
 *                               type: string
 *                               example: ""
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const userNameParam = url.searchParams.get("user-name") ?? undefined;
    const doctorNameParam = url.searchParams.get("doctor-name") ?? undefined;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const { data: session, error: sessionError } = await supabase.auth.getUser(token);
    if (sessionError || !session.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { data: requester, error: requesterError } = await supabaseAdmin
        .from("usuario")
        .select("id_usuario, nombre, apellido, rol")
        .eq("id_usuario", session.user.id)
        .single();
    if (requesterError || !requester) return NextResponse.json({ error: "User not found" }, { status: 404 });

    try {
        let candidateIds: string[] = [];

        const ilikePattern = (s?: string) => (s ? `%${s}%` : undefined);

        if (requester.rol === "USER") {
            candidateIds = [requester.id_usuario];
        } else if (requester.rol === "DOCTOR") {
            // Doctor: limit to their patients, optionally filtered by user-name
            let doctorPatientsQ = supabaseAdmin.from("usuario").select("id_usuario").eq("doctor_id", requester.id_usuario);
            if (userNameParam) {
                const p = ilikePattern(userNameParam)!;
                doctorPatientsQ = doctorPatientsQ.or(`nombre.ilike.${p},apellido.ilike.${p}`);
            }
            const { data: patients, error: pErr } = await doctorPatientsQ;
            if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
            candidateIds = (patients || []).map((r: any) => r.id_usuario);
        } else if (requester.rol === "ADMIN") {
            if (userNameParam) {
                const p = ilikePattern(userNameParam)!;
                const { data: users, error: uErr } = await supabaseAdmin
                    .from("usuario")
                    .select("id_usuario")
                    .or(`nombre.ilike.${p},apellido.ilike.${p}`);
                if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
                candidateIds = (users || []).map((u: any) => u.id_usuario);
            } else if (doctorNameParam) {
                // find doctors matching name, then their patients
                const p = ilikePattern(doctorNameParam)!;
                const { data: doctors, error: dErr } = await supabaseAdmin
                    .from("usuario")
                    .select("id_usuario")
                    .eq("rol", "DOCTOR")
                    .or(`nombre.ilike.${p},apellido.ilike.${p}`);
                if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

                const doctorIds = (doctors || []).map((d: any) => d.id_usuario);
                if (doctorIds.length === 0) return NextResponse.json({ results: [] });
                const { data: patients, error: patErr } = await supabaseAdmin
                    .from("usuario")
                    .select("id_usuario")
                    .in("doctor_id", doctorIds);
                if (patErr) return NextResponse.json({ error: patErr.message }, { status: 500 });
                candidateIds = (patients || []).map((p: any) => p.id_usuario);
            } else {
                const { data: users, error: uErr } = await supabaseAdmin.from("usuario").select("id_usuario");
                if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
                candidateIds = (users || []).map((u: any) => u.id_usuario);
            }
        } else {
            return NextResponse.json({ error: "Forbidden: unknown role" }, { status: 403 });
        }

        if (!candidateIds || candidateIds.length === 0) return NextResponse.json({ results: [] });

        const { data: preguntas, error: preguntasError } = await supabaseAdmin
            .from("preguntas")
            .select("id_usuario, pregunta, value")
            .in("id_usuario", candidateIds);

        if (preguntasError) return NextResponse.json({ error: preguntasError.message }, { status: 500 });
        if (!preguntas || preguntas.length === 0) return NextResponse.json({ results: [] });

        const grouped = preguntas.reduce((acc: Map<string, any[]>, p: any) => {
            const arr = acc.get(p.id_usuario) || [];
            arr.push({ pregunta: p.pregunta, value: p.value });
            acc.set(p.id_usuario, arr);
            return acc;
        }, new Map<string, any[]>());

        const idsWithPreguntas = Array.from(grouped.keys());
        if (idsWithPreguntas.length === 0) return NextResponse.json({ results: [] });

        const { data: usersForNames, error: namesError } = await supabaseAdmin
            .from("usuario")
            .select("id_usuario, nombre, apellido")
            .in("id_usuario", idsWithPreguntas);

        if (namesError) return NextResponse.json({ error: namesError.message }, { status: 500 });

        const nameMap = new Map<string, { nombre: string; apellido: string }>();
        (usersForNames || []).forEach((u: any) => nameMap.set(u.id_usuario, { nombre: u.nombre, apellido: u.apellido }));

        const results = idsWithPreguntas.map((id) => {
            const nm = nameMap.get(id) || { nombre: "Unknown", apellido: "" };
            const fullName = `${nm.nombre} ${nm.apellido}`.trim();
            return {
                nombre: fullName,
                preguntas_medicas: grouped.get(id) || [],
            };
        });

        return NextResponse.json({ results });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
}
