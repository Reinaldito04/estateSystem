import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  await prisma.task.deleteMany();
  await prisma.maintenancePlan.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.propertyReservation.deleteMany();
  await prisma.propertyTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.serviceProvider.deleteMany();
  await prisma.accountStatement.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.leaseSignature.deleteMany();
  await prisma.leaseGuarantor.deleteMany();
  await prisma.leaseClient.deleteMany();
  await prisma.contractSignatureEvent.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.property.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "admin@tuinmobiliaria.com",
      fullName: "Administrador",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const owner = await prisma.clientProfile.create({
    data: {
      fullName: "Propietario de Prueba",
      legalDocumentId: "OWNER-0001",
      phone: "555-0001",
      email: "owner@example.com",
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  const tenant = await prisma.clientProfile.create({
    data: {
      fullName: "Inquilino de Prueba",
      legalDocumentId: "TENANT-0001",
      phone: "555-0002",
      email: "tenant@example.com",
      role: "TENANT",
      status: "ACTIVE",
    },
  });

  const property = await prisma.property.create({
    data: {
      code: "PROP-0001",
      ownerId: owner.id,
      title: "Apartamento de prueba",
      address: "Calle Falsa 123",
      city: "Ciudad de Prueba",
      propertyType: "APARTMENT",
      status: "RENTED",
    },
  });

  const lease = await prisma.lease.create({
    data: {
      propertyId: property.id,
      contractNumber: "LEASE-0001",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      monthlyCanonAmount: new Prisma.Decimal(1000),
      currency: "USD",
      contractStatus: "ACTIVE",
      leaseClients: { create: { clientId: tenant.id, role: "TENANT" } },
      guarantors: {
        create: {
          clientId: tenant.id,
          fullName: "Fiador de Prueba",
          legalDocumentId: "GUARANTOR-0001",
          phone: "555-0003",
        },
      },
      signature: {
        create: { provider: "LOCAL", method: "ELECTRONIC", status: "SIGNED", signedBy: "Inquilino de Prueba", signedAt: new Date() },
      },
    },
    include: { guarantors: true, signature: true, leaseClients: true },
  });

  await prisma.transaction.create({
    data: {
      propertyId: property.id,
      leaseId: lease.id,
      category: "RENT_CANON",
      amount: new Prisma.Decimal(1000),
      currency: "USD",
      status: "PAID",
      paymentDate: new Date(),
      paymentMethod: "TRANSFER",
    },
  });

  await prisma.auditLog.create({
    data: { userId: admin.id, entityType: "Lease", entityId: lease.id, action: "CREATE", changes: {} },
  });
  await prisma.auditLog.create({
    data: { userId: admin.id, entityType: "Property", entityId: property.id, action: "CREATE", changes: { code: property.code } },
  });

  const provider = await prisma.serviceProvider.create({
    data: {
      companyName: "Servicios Técnicos Integrales",
      contactName: "Carlos Méndez",
      type: "MAINTENANCE",
      phone: "555-0100",
      email: "contacto@sti.example.com",
      specialty: "Plomería y electricidad",
      rating: 4,
      createdById: admin.id,
    },
  });

  const asset = await prisma.asset.create({
    data: {
      propertyId: property.id,
      name: "Aire acondicionado split",
      category: "Electrodoméstico",
      brand: "Samsung",
      model: "AR12",
      serialNumber: "SN-123456",
      quantity: 2,
      condition: "GOOD",
      status: "ACTIVE",
      location: "Sala y habitación principal",
      purchaseValue: new Prisma.Decimal(650),
      currency: "USD",
      createdById: admin.id,
    },
  });

  const tag = await prisma.tag.upsert({
    where: { name: "Premium" },
    update: {},
    create: { name: "Premium", color: "#2563eb" },
  });
  await prisma.propertyTag.create({ data: { propertyId: property.id, tagId: tag.id } });

  const plan = await prisma.maintenancePlan.create({
    data: {
      propertyId: property.id,
      assetId: asset.id,
      providerId: provider.id,
      title: "Mantenimiento trimestral de aire acondicionado",
      description: "Limpieza de filtros y revisión general",
      category: "MAINTENANCE",
      frequency: "QUARTERLY",
      intervalCount: 3,
      nextDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
    },
  });

  await prisma.task.create({
    data: {
      title: plan.title,
      description: plan.description,
      category: "MAINTENANCE",
      dueDate: plan.nextDueDate,
      recurrence: "QUARTERLY",
      planId: plan.id,
      propertyId: property.id,
      assetId: asset.id,
      providerId: provider.id,
      assigneeId: admin.id,
      createdById: admin.id,
    },
  });

  await prisma.task.create({
    data: {
      title: "Revisar contrato de arrendamiento",
      category: "REVIEW",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      leaseId: lease.id,
      propertyId: property.id,
      clientId: tenant.id,
      createdById: admin.id,
    },
  });

  await prisma.propertyReservation.create({
    data: {
      propertyId: property.id,
      type: "LEASE_HOLD",
      status: "CONFIRMED",
      startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
      clientId: tenant.id,
      notes: "Apartado de fechas de ejemplo",
      createdById: admin.id,
    },
  });

  console.log("Seed OK:", {
    admin: admin.email,
    owner: owner.legalDocumentId,
    tenant: tenant.legalDocumentId,
    lease: lease.contractNumber,
    asset: asset.name,
    provider: provider.companyName,
    tag: tag.name,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
