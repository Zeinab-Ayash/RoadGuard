-- RoadGuard seed data (Supabase / Postgres)

insert into misbehavior_type (behavior_name, severity_score) values
  ('Drowsiness', 10),
  ('Eyes Off Road', 8),
  ('Phone Usage', 7),
  ('No Seatbelt', 5),
  ('Eating While Driving', 4);
