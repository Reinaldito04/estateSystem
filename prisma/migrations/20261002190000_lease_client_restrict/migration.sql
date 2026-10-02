-- DropForeignKey
ALTER TABLE "lease_clients" DROP CONSTRAINT "lease_clients_client_id_fkey";

-- AddForeignKey
ALTER TABLE "lease_clients" ADD CONSTRAINT "lease_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
