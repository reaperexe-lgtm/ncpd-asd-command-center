-- Seed active flight licenses from provided list
-- Team mapping:
-- 01-05 -> Team Red
-- 06-25 -> Team Blue
-- 26-40 -> Team Gold
-- 41+ -> Team Silver
-- Units are intentionally left empty/null.

INSERT INTO public.flight_licenses (name, license_date, team, unit, status)
VALUES
  ('Andrew Petzenstein', '2026-07-08', 'Team Gold', NULL, 'active'),
  ('Florian Royal', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Kai Berger', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Tefion Noir', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Ryan Coleman', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Pieper', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Luan Kamata', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Rick Grimes', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('John Williams', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Leon Diablo', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Navilan Veliki', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Atilla Kader', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Robert White', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Hubert Meier', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Aziz Fuchs', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('MaryJane Kowalski', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Heimdall Fuchs', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Gabriel Rodrigues', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Nino Krüger', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Emanuel Wiltfang', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Tiberius Zeller', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Vincenzo DeRossi', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Briggan Wolf', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('John Wilson', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Nicolas Zeller', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Max Bueno', '2026-07-06', 'Team Silver', NULL, 'active'),
  ('Lola Sullivan', '2026-07-06', 'Team Gold', NULL, 'active'),
  ('Leo Abrucy', '2026-07-06', 'Team Gold', NULL, 'active'),
  ('Burak Aslan', '2026-07-06', 'Team Gold', NULL, 'active'),
  ('Marco Moretti', '2026-07-06', 'Team Gold', NULL, 'active'),
  ('James Hamady', '2026-07-06', 'Team Gold', NULL, 'active'),
  ('Tom Caruso', '2026-07-06', 'Team Gold', NULL, 'active'),
  ('Lucio Black', '2026-07-06', 'Team Gold', NULL, 'active'),
  ('Hansi Schmitt', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Ralf Hawk', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Levi Henchy', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Ryuk Kurosaki', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Mason Brooks', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Pablo Morales', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Lenzo Black', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Karsten Sohns', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Leonardo Coleman', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Lucifer Black', '2026-07-06', 'Team Blue', NULL, 'active'),
  ('Hazel Delaney-Bennet', '2026-07-06', 'Team Red', NULL, 'active'),
  ('Jan Eisenherz', '2026-07-06', 'Team Red', NULL, 'active'),
  ('Franz Adler', '2026-07-06', 'Team Red', NULL, 'active'),
  ('Dr. Issac Adams', '2026-07-06', 'Team Red', NULL, 'active');
