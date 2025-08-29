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

  // fetch requester info
  const { data: requester, error: requesterError } = await supabaseAdmin
    .from("usuario")
    .select("id_usuario, nombre, apellido, rol")
    .eq("id_usuario", session.user.id)
    .single();
  if (requesterError || !requester) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    // Build candidate user ids according to role + optional name filters
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
      // Admin: flexible filters by user-name or doctor-name
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
        // no name filters: all users
        const { data: users, error: uErr } = await supabaseAdmin.from("usuario").select("id_usuario");
        if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
        candidateIds = (users || []).map((u: any) => u.id_usuario);
      }
    } else {
      return NextResponse.json({ error: "Forbidden: unknown role" }, { status: 403 });
    }

    if (!candidateIds || candidateIds.length === 0) return NextResponse.json({ results: [] });

    // Fetch preguntas only for candidateIds
    const { data: preguntas, error: preguntasError } = await supabaseAdmin
      .from("preguntas")
      .select("id_usuario, pregunta, value")
      .in("id_usuario", candidateIds);

    if (preguntasError) return NextResponse.json({ error: preguntasError.message }, { status: 500 });
    if (!preguntas || preguntas.length === 0) return NextResponse.json({ results: [] });

    // Group preguntas by user id
    const grouped = preguntas.reduce((acc: Map<string, any[]>, p: any) => {
      const arr = acc.get(p.id_usuario) || [];
      arr.push({ pregunta: p.pregunta, value: p.value });
      acc.set(p.id_usuario, arr);
      return acc;
    }, new Map<string, any[]>());

    const idsWithPreguntas = Array.from(grouped.keys());
    if (idsWithPreguntas.length === 0) return NextResponse.json({ results: [] });

    // Fetch names only for ids that have preguntas
    const { data: usersForNames, error: namesError } = await supabaseAdmin
      .from("usuario")
      .select("id_usuario, nombre, apellido")
      .in("id_usuario", idsWithPreguntas);

    if (namesError) return NextResponse.json({ error: namesError.message }, { status: 500 });

    const nameMap = new Map<string, { nombre: string; apellido: string }>();
    (usersForNames || []).forEach((u: any) => nameMap.set(u.id_usuario, { nombre: u.nombre, apellido: u.apellido }));

    // Build results only for users that have preguntas
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

/* 
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userIdParam = url.searchParams.get("user-id");
  const doctorIdParam = url.searchParams.get("doctor-id");
  const userNameParam = url.searchParams.get("user-name");
  const doctorNameParam = url.searchParams.get("doctor-name");

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);
  if (sessionError || !sessionData.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const requesterId = sessionData.user.id;

  // fetch requester usuario row
  const { data: requester, error: requesterError } = await supabaseAdmin
    .from("usuario")
    .select("id_usuario, nombre, apellido, rol")
    .eq("id_usuario", requesterId)
    .single();

  if (requesterError || !requester) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Helper: return empty results
  const emptyRes = { results: [] as Array<{ nombre: string; preguntas_medicas: { pregunta: string; value: any }[] }> };

  // Build target user IDs based on role + params
  let targetIds: string[] = [];

  try {
    if (requester.rol === "USER") {
      // USER only sees themselves regardless of params
      targetIds = [requester.id_usuario];
    } else if (requester.rol === "DOCTOR") {
      // DOCTOR: may filter by user-id (only if that user is their patient),
      // or by user-name (partial match among their patients),
      // or by doctor-id (only allowed if equals their own id)
      if (doctorIdParam && doctorIdParam !== requester.id_usuario) {
        return NextResponse.json({ error: "Forbidden: doctor-id must be your own id" }, { status: 403 });
      }

      if (userIdParam) {
        // verify the user is a patient of this doctor
        const { data: u, error: ue } = await supabaseAdmin
          .from("usuario")
          .select("id_usuario")
          .eq("id_usuario", userIdParam)
          .eq("doctor_id", requester.id_usuario)
          .maybeSingle();
        if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });
        if (!u) return NextResponse.json(emptyRes);
        targetIds = [u.id_usuario];
      } else if (userNameParam) {
        // find patients of this doctor with partial match on nombre or apellido
        const pattern = `%${userNameParam}%`;
        const { data: patients, error: pe } = await supabaseAdmin
          .from("usuario")
          .select("id_usuario")
          .eq("doctor_id", requester.id_usuario)
          .or(`nombre.ilike.${pattern},apellido.ilike.${pattern}`);
        if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });
        targetIds = (patients || []).map((p: any) => p.id_usuario);
        if (targetIds.length === 0) return NextResponse.json(emptyRes);
      } else {
        // default: all patients of this doctor
        const { data: patients, error: pe } = await supabaseAdmin
          .from("usuario")
          .select("id_usuario")
          .eq("doctor_id", requester.id_usuario);
        if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });
        targetIds = (patients || []).map((p: any) => p.id_usuario);
        if (targetIds.length === 0) return NextResponse.json(emptyRes);
      }
    } else if (requester.rol === "ADMIN") {
      // ADMIN: flexible filters by user-id, doctor-id, user-name, doctor-name
      if (userIdParam) {
        // single user
        targetIds = [userIdParam];
      } else if (doctorIdParam) {
        // all users with that doctor_id
        const { data: patients, error: pe } = await supabaseAdmin
          .from("usuario")
          .select("id_usuario")
          .eq("doctor_id", doctorIdParam);
        if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });
        targetIds = (patients || []).map((p: any) => p.id_usuario);
        if (targetIds.length === 0) return NextResponse.json(emptyRes);
      } else if (userNameParam) {
        // any user matching name
        const pattern = `%${userNameParam}%`;
        const { data: users, error: ue } = await supabaseAdmin
          .from("usuario")
          .select("id_usuario")
          .or(`nombre.ilike.${pattern},apellido.ilike.${pattern}`);
        if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });
        targetIds = (users || []).map((p: any) => p.id_usuario);
        if (targetIds.length === 0) return NextResponse.json(emptyRes);
      } else if (doctorNameParam) {
        // find doctors matching name, then their patients
        const pattern = `%${doctorNameParam}%`;
        const { data: doctors, error: de } = await supabaseAdmin
          .from("usuario")
          .select("id_usuario")
          .eq("rol", "DOCTOR")
          .or(`nombre.ilike.${pattern},apellido.ilike.${pattern}`);
        if (de) return NextResponse.json({ error: de.message }, { status: 500 });
        const doctorIds = (doctors || []).map((d: any) => d.id_usuario);
        if (doctorIds.length === 0) return NextResponse.json(emptyRes);

        const { data: patients, error: pe } = await supabaseAdmin
          .from("usuario")
          .select("id_usuario")
          .in("doctor_id", doctorIds);
        if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });
        targetIds = (patients || []).map((p: any) => p.id_usuario);
        if (targetIds.length === 0) return NextResponse.json(emptyRes);
      } else {
        // no filters: all users
        const { data: users, error: ue } = await supabaseAdmin
          .from("usuario")
          .select("id_usuario");
        if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });
        targetIds = (users || []).map((p: any) => p.id_usuario);
        if (targetIds.length === 0) return NextResponse.json(emptyRes);
      }
    } else {
      return NextResponse.json({ error: "Forbidden: unknown role" }, { status: 403 });
    }

    // Fetch preguntas for targetIds
    if (!targetIds || targetIds.length === 0) return NextResponse.json(emptyRes);

    const { data: preguntas, error: preguntasError } = await supabaseAdmin
      .from("preguntas")
      .select("pregunta, value, id_usuario")
      .in("id_usuario", targetIds);

    if (preguntasError) return NextResponse.json({ error: preguntasError.message }, { status: 500 });

    // Fetch user names for targets
    const { data: usersForNames, error: namesError } = await supabaseAdmin
      .from("usuario")
      .select("id_usuario, nombre, apellido")
      .in("id_usuario", targetIds);

    if (namesError) return NextResponse.json({ error: namesError.message }, { status: 500 });

    const nameMap = new Map<string, { nombre: string; apellido: string }>();
    (usersForNames || []).forEach((u: any) => {
      nameMap.set(u.id_usuario, { nombre: u.nombre, apellido: u.apellido });
    });

    // Group preguntas by user id
    const grouped = new Map<string, { pregunta: string; value: any }[]>();
    (preguntas || []).forEach((p: any) => {
      if (!grouped.has(p.id_usuario)) grouped.set(p.id_usuario, []);
      grouped.get(p.id_usuario)!.push({ pregunta: p.pregunta, value: p.value });
    });

    // Build results array
    const results: Array<{ nombre: string; preguntas_medicas: { pregunta: string; value: any }[] }> = [];
    for (const id of targetIds) {
      const name = nameMap.get(id);
      const fullName = name ? `${name.nombre} ${name.apellido}` : "Unknown";
      const items = grouped.get(id) || [];
      // Only include users that actually have preguntas or include empty arrays? Spec says results array; include even empty arrays if admin requested.
      results.push({ nombre: fullName, preguntas_medicas: items });
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
} */




/* export async function GET(req: NextRequest) {
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

    

    let query = supabaseAdmin.from("preguntas").select("pregunta, value");

    
    if (usuario.rol === "USER") {
        query = query.eq("id_usuario", usuario.id_usuario);
    }
    else if (usuario.rol === "DOCTOR") {
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

} */



