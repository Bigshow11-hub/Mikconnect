-- RadiusCredential contient les secrets d'authentification WiFi de tous les
-- tenants. La table a été ajoutée après la migration RLS initiale et doit être
-- soumise à la même isolation que les autres ressources métier.

ALTER TABLE "RadiusCredential" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "RadiusCredential";
CREATE POLICY tenant_isolation ON "RadiusCredential"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::text)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::text);

-- Ne pas activer FORCE ROW LEVEL SECURITY tant que les migrations et le
-- runtime utilisent le même rôle PostgreSQL. En production, le runtime doit
-- utiliser un rôle non propriétaire et FreeRADIUS un rôle en lecture limité
-- aux vues radcheck/radreply.
