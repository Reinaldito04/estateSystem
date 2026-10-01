-- CreateEnum
CREATE TYPE "DocumentEntityType" AS ENUM ('OWNER', 'TENANT', 'PROPERTY', 'LEASE');

-- CreateEnum
CREATE TYPE "ClientRole" AS ENUM ('OWNER', 'TENANT', 'BUYER', 'PROSPECT', 'GUARANTOR');

-- CreateEnum
CREATE TYPE "ClientMaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COMMON_LAW');

-- CreateEnum
CREATE TYPE "ClientCommunicationChannel" AS ENUM ('EMAIL', 'SMS', 'CALL', 'WHATSAPP', 'MESSAGE', 'FORMAL_REQUEST');

-- CreateEnum
CREATE TYPE "ClientRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ClientRiskDocumentType" AS ENUM ('INCOME_PROOF', 'PERSONAL_REFERENCE', 'LABOR_REFERENCE', 'CREDIT_REPORT');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('PERSONAL', 'LABOR', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('RENT_CANON', 'RESERVATION', 'SECURITY_DEPOSIT', 'CONTRACT_FEE', 'CONDO_FEE', 'ELECTRICITY', 'INTERNET', 'OTHER_SERVICE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('USD', 'EUR', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('REPORTED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IssueReportedByType" AS ENUM ('CLIENT', 'OWNER', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LEASE_EXPIRATION', 'RENOVATION_PROPOSAL', 'OWNER_NOTICE');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'STUDIO', 'OFFICE', 'COMMERCIAL', 'WAREHOUSE', 'LAND', 'PARKING', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('NEW', 'CONTACTED', 'VISITING', 'NEGOTIATING', 'CONVERTED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RenewalMode" AS ENUM ('MANUAL', 'AUTOMATIC', 'NONE');

-- CreateEnum
CREATE TYPE "PriceAdjustmentType" AS ENUM ('NONE', 'FIXED_AMOUNT', 'PERCENTAGE', 'INDEX');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SENT', 'SIGNED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('NONE', 'ELECTRONIC', 'DIGITAL_CERTIFICATE', 'WET_SIGNATURE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT', 'ASSISTANT', 'ACCOUNTANT', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_hash" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "legal_document_id" TEXT NOT NULL,
    "marital_status" "ClientMaritalStatus",
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "role" "ClientRole" NOT NULL DEFAULT 'PROSPECT',
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "risk_level" "ClientRiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "risk_summary" TEXT,
    "notes" TEXT,
    "bank_details" TEXT,
    "work_place" TEXT,
    "monthly_income" DECIMAL(12,2),
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "preferred_property_type" TEXT,
    "max_budget" DECIMAL(12,2),
    "housing_requirement" TEXT,
    "identity_document_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_references" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "reference_type" "ReferenceType" NOT NULL DEFAULT 'PERSONAL',
    "full_name" TEXT NOT NULL,
    "relationship" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_communications" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "channel" "ClientCommunicationChannel" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL DEFAULT 'OUTBOUND',
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "related_request" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_risk_documents" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "document_type" "ClientRiskDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT,
    "notes" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_risk_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "property_type" "PropertyType" NOT NULL DEFAULT 'APARTMENT',
    "total_area_sqm" DOUBLE PRECISION,
    "built_area_sqm" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "parking_spaces" INTEGER,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "condo_name" TEXT,
    "condo_account_number" TEXT,
    "electricity_account_number" TEXT,
    "internet_provider" TEXT,
    "internet_account_number" TEXT,
    "video_url" TEXT,
    "floor_plan_url" TEXT,
    "virtual_tour_url" TEXT,
    "capture_commission" DECIMAL(5,2),
    "capture_exclusive" BOOLEAN NOT NULL DEFAULT false,
    "capture_contract_url" TEXT,
    "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_keys" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "holder_name" TEXT NOT NULL,
    "holder_role" TEXT NOT NULL,
    "key_count" INTEGER NOT NULL DEFAULT 1,
    "access_code" TEXT,
    "notes" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_visits" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "client_id" TEXT,
    "visitor_name" TEXT NOT NULL,
    "visitor_phone" TEXT,
    "visitor_email" TEXT,
    "purpose" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "visited_at" TIMESTAMP(3),
    "status" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_photos" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "description" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_interests" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "client_id" TEXT,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "status" "InterestStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_comments" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL DEFAULT 'Equipo',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_reviews" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "reviewer_name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "contract_number" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "monthly_canon_amount" DECIMAL(10,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'USD',
    "deposit_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "reservation_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "contract_fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "contract_file_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "contract_status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "renewal_mode" "RenewalMode" NOT NULL DEFAULT 'MANUAL',
    "renewal_notice_days" INTEGER NOT NULL DEFAULT 30,
    "price_adjustment_type" "PriceAdjustmentType" NOT NULL DEFAULT 'NONE',
    "price_adjustment_value" DECIMAL(8,4),
    "price_adjustment_index" TEXT,
    "next_adjustment_date" TIMESTAMP(3),
    "template_id" TEXT,
    "draft_content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lease_clients" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "role" "ClientRole" NOT NULL DEFAULT 'TENANT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lease_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lease_guarantors" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "client_id" TEXT,
    "full_name" TEXT NOT NULL,
    "legal_document_id" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "relationship" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lease_guarantors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lease_signatures" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "provider" TEXT,
    "envelope_id" TEXT,
    "status" "SignatureStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "method" "SignatureMethod" NOT NULL DEFAULT 'NONE',
    "signed_by" TEXT,
    "signature_hash" TEXT,
    "signature_data" TEXT,
    "signature_consent_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "signed_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lease_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contract_type" TEXT NOT NULL DEFAULT 'LEASE',
    "description" TEXT,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_signature_events" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ip_address" TEXT,
    "actor_name" TEXT,
    "actor_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_signature_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "lease_id" TEXT,
    "category" "PaymentCategory" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "payment_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "payment_method" TEXT NOT NULL,
    "reference_number" TEXT,
    "receipt_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_issues" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "client_id" TEXT,
    "report_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issue_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'REPORTED',
    "reported_by_type" "IssueReportedByType" NOT NULL DEFAULT 'CLIENT',
    "reported_by_user_id" TEXT,
    "repair_date" TIMESTAMP(3),
    "repair_details" TEXT,
    "repair_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lease_proposals_and_notices" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "notice_type" "NotificationType" NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposed_canon_amount" DECIMAL(10,2),
    "proposed_start_date" TIMESTAMP(3),
    "proposed_end_date" TIMESTAMP(3),
    "document_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lease_proposals_and_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_documents" (
    "id" TEXT NOT NULL,
    "entity_type" "DocumentEntityType" NOT NULL,
    "client_id" TEXT,
    "property_id" TEXT,
    "lease_id" TEXT,
    "document_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_by_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_legal_document_id_key" ON "client_profiles"("legal_document_id");

-- CreateIndex
CREATE INDEX "client_profiles_role_status_idx" ON "client_profiles"("role", "status");

-- CreateIndex
CREATE INDEX "client_references_client_id_created_at_idx" ON "client_references"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "client_communications_client_id_created_at_idx" ON "client_communications"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "client_risk_documents_client_id_uploaded_at_idx" ON "client_risk_documents"("client_id", "uploaded_at");

-- CreateIndex
CREATE UNIQUE INDEX "properties_code_key" ON "properties"("code");

-- CreateIndex
CREATE INDEX "property_keys_property_id_is_active_idx" ON "property_keys"("property_id", "is_active");

-- CreateIndex
CREATE INDEX "property_visits_property_id_scheduled_at_idx" ON "property_visits"("property_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "property_interests_property_id_created_at_idx" ON "property_interests"("property_id", "created_at");

-- CreateIndex
CREATE INDEX "property_comments_property_id_created_at_idx" ON "property_comments"("property_id", "created_at");

-- CreateIndex
CREATE INDEX "property_reviews_property_id_created_at_idx" ON "property_reviews"("property_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "leases_contract_number_key" ON "leases"("contract_number");

-- CreateIndex
CREATE INDEX "lease_clients_client_id_role_idx" ON "lease_clients"("client_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "lease_clients_lease_id_client_id_role_key" ON "lease_clients"("lease_id", "client_id", "role");

-- CreateIndex
CREATE INDEX "lease_guarantors_lease_id_idx" ON "lease_guarantors"("lease_id");

-- CreateIndex
CREATE UNIQUE INDEX "lease_signatures_lease_id_key" ON "lease_signatures"("lease_id");

-- CreateIndex
CREATE INDEX "contract_signature_events_lease_id_created_at_idx" ON "contract_signature_events"("lease_id", "created_at");

-- CreateIndex
CREATE INDEX "entity_documents_entity_type_client_id_idx" ON "entity_documents"("entity_type", "client_id");

-- CreateIndex
CREATE INDEX "entity_documents_entity_type_property_id_idx" ON "entity_documents"("entity_type", "property_id");

-- CreateIndex
CREATE INDEX "entity_documents_entity_type_lease_id_idx" ON "entity_documents"("entity_type", "lease_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_references" ADD CONSTRAINT "client_references_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_communications" ADD CONSTRAINT "client_communications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_risk_documents" ADD CONSTRAINT "client_risk_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_keys" ADD CONSTRAINT "property_keys_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_visits" ADD CONSTRAINT "property_visits_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_visits" ADD CONSTRAINT "property_visits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interests" ADD CONSTRAINT "property_interests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_interests" ADD CONSTRAINT "property_interests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_comments" ADD CONSTRAINT "property_comments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_comments" ADD CONSTRAINT "property_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_reviews" ADD CONSTRAINT "property_reviews_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_reviews" ADD CONSTRAINT "property_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_clients" ADD CONSTRAINT "lease_clients_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_clients" ADD CONSTRAINT "lease_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_guarantors" ADD CONSTRAINT "lease_guarantors_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_guarantors" ADD CONSTRAINT "lease_guarantors_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_signatures" ADD CONSTRAINT "lease_signatures_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signature_events" ADD CONSTRAINT "contract_signature_events_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signature_events" ADD CONSTRAINT "contract_signature_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_issues" ADD CONSTRAINT "property_issues_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_issues" ADD CONSTRAINT "property_issues_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_issues" ADD CONSTRAINT "property_issues_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_proposals_and_notices" ADD CONSTRAINT "lease_proposals_and_notices_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_documents" ADD CONSTRAINT "entity_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_documents" ADD CONSTRAINT "entity_documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_documents" ADD CONSTRAINT "entity_documents_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_documents" ADD CONSTRAINT "entity_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
