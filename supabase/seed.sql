-- ContractorOS Demo Seed
-- Solo para desarrollo. NO ejecutar en producción.
-- Requiere que ya exista un usuario auth y una empresa.

-- Ejemplo de cómo poblar después del registro:
-- 1. Regístrate por la UI
-- 2. Copia tu company_id y user_id
-- 3. Reemplaza los UUIDs abajo y ejecuta

/*
-- Clientes de ejemplo
INSERT INTO clients (company_id, name, contact_name, email, phone, is_active) VALUES
  ('YOUR_COMPANY_ID', 'Juan Rivera', 'Juan Rivera', 'juan@email.com', '(305) 555-0101', true),
  ('YOUR_COMPANY_ID', 'Oficina Torres LLC', 'María Torres', 'maria@torres.com', '(305) 555-0102', true),
  ('YOUR_COMPANY_ID', 'Residencial Los Pinos', 'Pedro Sánchez', 'pedro@email.com', '(305) 555-0103', true);

-- Proyectos de ejemplo (reemplaza client_ids)
INSERT INTO projects (
  company_id, client_id, name, status, contract_value,
  budget_total, budget_materials, budget_labor, budget_other, start_date
) VALUES
  ('YOUR_COMPANY_ID', 'CLIENT_1_ID', 'Casa Rivera – Panel eléctrico', 'active', 18500, 12000, 7500, 3500, 1000, '2026-06-12'),
  ('YOUR_COMPANY_ID', 'CLIENT_2_ID', 'Oficina Torres – Remodelación', 'approved', 32800, 22000, 14000, 6000, 2000, NULL),
  ('YOUR_COMPANY_ID', 'CLIENT_3_ID', 'Los Pinos – HVAC + eléctricos', 'active', 24900, 17500, 10000, 5500, 2000, '2026-05-01');
*/
