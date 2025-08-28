import { NextRequest, NextResponse } from 'next/server';



/** 
 *@openapi
 * /api/:
 *   get:
 *     description: Test endpoint
 *     responses:
 *       200:
 *         description: Says hello
 */
export async function GET(request: NextRequest) {
    return NextResponse.json({ message: "Hello!" });
}