import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("AUTOSAVE", body);

    return NextResponse.json({
      success: true,
      message: "Autosave completed",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Autosave failed",
      },
      {
        status: 500,
      }
    );
  }
}