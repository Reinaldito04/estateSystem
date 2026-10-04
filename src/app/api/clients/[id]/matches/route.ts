import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFoundResponse } from "@/lib/domain-error";
import { isUuid } from "@/lib/route-params";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();

    const client = await prisma.clientProfile.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        city: true,
        preferredPropertyType: true,
        maxBudget: true,
        housingRequirement: true,
      },
    });
    if (!client) return notFoundResponse("Cliente no encontrado");

    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? 6), 1), 20);
    const preferredType = (client.preferredPropertyType ?? "").trim().toUpperCase().replace(/\s+/g, "_");
    const budget = client.maxBudget === null ? null : Number(client.maxBudget);
    const clientCity = (client.city ?? "").trim().toLowerCase();

    const properties = await prisma.property.findMany({
      where: { deletedAt: null, status: "AVAILABLE" },
      select: {
        id: true,
        code: true,
        title: true,
        address: true,
        city: true,
        propertyType: true,
        bedrooms: true,
        bathrooms: true,
        parkingSpaces: true,
        totalAreaSqm: true,
        askingRentAmount: true,
        askingRentCurrency: true,
        owner: { select: { id: true, fullName: true } },
      },
      take: 200,
      orderBy: { createdAt: "desc" },
    });

    const scored = properties.map((property) => {
      let score = 0;
      const reasons: string[] = [];

      if (preferredType && preferredType !== "OTHER" && preferredType === property.propertyType) {
        score += 40;
        reasons.push("Tipo coincidente");
      }

      if (clientCity && property.city && property.city.toLowerCase() === clientCity) {
        score += 30;
        reasons.push("Misma ciudad");
      }

      const askingRent = property.askingRentAmount === null ? null : Number(property.askingRentAmount);
      if (budget !== null && askingRent !== null) {
        if (askingRent <= budget) {
          score += 25;
          reasons.push("Dentro del presupuesto");
        } else {
          score -= 20;
          reasons.push("Sobre el presupuesto");
        }
      } else if (budget !== null && askingRent === null) {
        reasons.push("Sin canon publicado");
      }

      return {
        ...property,
        askingRentAmount: askingRent,
        score,
        reasons,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return NextResponse.json({ data: scored.slice(0, limit) });
  } catch (error) {
    console.error("Error matching properties:", error);
    return NextResponse.json({ error: "Error al buscar coincidencias" }, { status: 500 });
  }
}
