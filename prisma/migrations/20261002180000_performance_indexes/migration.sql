-- CreateIndex
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "properties_property_type_idx" ON "properties"("property_type");

-- CreateIndex
CREATE INDEX "properties_deleted_at_idx" ON "properties"("deleted_at");

-- CreateIndex
CREATE INDEX "leases_property_id_idx" ON "leases"("property_id");

-- CreateIndex
CREATE INDEX "leases_contract_status_idx" ON "leases"("contract_status");

-- CreateIndex
CREATE INDEX "leases_end_date_idx" ON "leases"("end_date");

-- CreateIndex
CREATE INDEX "leases_next_adjustment_date_idx" ON "leases"("next_adjustment_date");

-- CreateIndex
CREATE INDEX "leases_deleted_at_idx" ON "leases"("deleted_at");

-- CreateIndex
CREATE INDEX "leases_is_active_end_date_idx" ON "leases"("is_active", "end_date");

-- CreateIndex
CREATE INDEX "transactions_property_id_idx" ON "transactions"("property_id");

-- CreateIndex
CREATE INDEX "transactions_lease_id_idx" ON "transactions"("lease_id");

-- CreateIndex
CREATE INDEX "transactions_payment_date_idx" ON "transactions"("payment_date");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_category_idx" ON "transactions"("category");

-- CreateIndex
CREATE INDEX "transactions_property_id_payment_date_idx" ON "transactions"("property_id", "payment_date");

-- CreateIndex
CREATE INDEX "property_issues_property_id_idx" ON "property_issues"("property_id");

-- CreateIndex
CREATE INDEX "property_issues_status_idx" ON "property_issues"("status");

-- CreateIndex
CREATE INDEX "property_issues_report_date_idx" ON "property_issues"("report_date");
