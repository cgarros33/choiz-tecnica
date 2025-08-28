import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';



/** 
 *@openapi
 * /api/roles:
 *   get:
 *     description: Roles endpoint
 *     responses:
 *       200:
 *         description: Returns roles from the database
 */
export async function GET(request: NextRequest) {
    const { data, error } = await supabase.from('rol').select('*');
    return NextResponse.json({ message: data });
}