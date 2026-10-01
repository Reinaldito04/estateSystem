import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
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

  console.log("Seed OK:", {
    admin: admin.email,
    owner: owner.legalDocumentId,
    tenant: tenant.legalDocumentId,
    lease: lease.contractNumber,
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
