import { notFoundResponse } from "@/lib/domain-error";
import { isUuid } from "@/lib/route-params";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validationError } from "@/lib/validation";
import { interestStatusToUi, toInterestStatus } from "@/lib/enum-mapping";

const crmRecordSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("interest"),
    fullName: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    source: z.string().optional(),
    status: z.enum(["new", "contacted", "visit_scheduled", "converted", "lost"]).default("new"),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("comment"),
    authorName: z.string().min(1).default("Equipo"),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("review"),
    reviewerName: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(1),
  }),
]);

const deleteSchema = z.object({
  type: z.enum(["interest", "comment", "review"]),
  id: z.string().uuid(),
});

const interestUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "visit_scheduled", "converted", "lost"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        customFields: true,
        photos: { orderBy: { uploadedAt: "desc" } },
        documents: { orderBy: { uploadedAt: "desc" } },
        interests: { orderBy: { createdAt: "desc" } },
        comments: { orderBy: { createdAt: "desc" } },
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ...property,
      interests: property.interests.map((interest) => ({ ...interest, status: interestStatusToUi(interest.status) })),
    });
  } catch (error) {
    console.error("Error fetching property CRM:", error);
    return NextResponse.json({ error: "Error al obtener actividad del inmueble" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const body = interestUpdateSchema.parse(await request.json());
    const existing = await prisma.propertyInterest.findFirst({
      where: { id: body.id, propertyId: id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Interesado no encontrado" }, { status: 404 });
    }

    const interest = await prisma.propertyInterest.update({
      where: { id: body.id },
      data: { status: toInterestStatus(body.status) },
    });

    return NextResponse.json({ ...interest, status: interestStatusToUi(interest.status) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error updating property interest:", error);
    return NextResponse.json({ error: "Error al actualizar el interesado" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const body = crmRecordSchema.parse(await request.json());
    const propertyExists = await prisma.property.findUnique({ where: { id }, select: { id: true } });

    if (!propertyExists) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    const data = body.type === "interest"
      ? await prisma.propertyInterest.create({
          data: {
            propertyId: id,
            fullName: body.fullName,
            email: body.email || null,
            phone: body.phone || null,
            source: body.source || null,
            status: toInterestStatus(body.status),
            notes: body.notes || null,
          },
        })
      : body.type === "comment"
        ? await prisma.propertyComment.create({
            data: { propertyId: id, authorName: body.authorName, content: body.content },
          })
        : await prisma.propertyReview.create({
            data: {
              propertyId: id,
              reviewerName: body.reviewerName,
              rating: body.rating,
              comment: body.comment,
            },
          });

    const responseData = body.type === "interest"
      ? { ...data, status: interestStatusToUi((data as { status: Parameters<typeof interestStatusToUi>[0] }).status) }
      : data;

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error creating property CRM record:", error);
    return NextResponse.json({ error: "Error al guardar el registro" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFoundResponse();
    const body = deleteSchema.parse(await request.json());
    const where = { id: body.id, propertyId: id };
    const result = body.type === "interest"
      ? await prisma.propertyInterest.deleteMany({ where })
      : body.type === "comment"
        ? await prisma.propertyComment.deleteMany({ where })
        : await prisma.propertyReview.deleteMany({ where });

    if (result.count === 0) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    console.error("Error deleting property CRM record:", error);
    return NextResponse.json({ error: "Error al eliminar el registro" }, { status: 500 });
  }
}