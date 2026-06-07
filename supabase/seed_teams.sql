-- ============================================================
-- Team Seed Data
-- Run this in the Supabase SQL Editor AFTER schema.sql.
-- Dummy values are used for country, coach_name,
-- team_description, and team_members for testing purposes.
-- ============================================================

insert into public.teams
  (team_name, category, country, coach_name, team_description, team_members)
values

-- ── Senior Division (20 teams) ─────────────────────────────

('Redeemer Tech',         'Senior', 'Ghana', 'Coach Samuel Adu',    'A disciplined senior team from Redeemer''s School.',         '["Kwame Asante", "Ama Boateng", "Kofi Mensah"]'),
('Ahtoo Alpha Gold ST',   'Senior', 'Ghana', 'Coach Beatrice Owusu','Veterans of the national robotics circuit.',                  '["Akosua Frimpong", "Yaw Darko", "Nana Appiah"]'),
('Klone',                 'Senior', 'Ghana', 'Coach Eric Nkrumah',  'Known for precise autonomous routines.',                     '["Elikem Dordor", "Kafui Ametefe", "Selorm Agbi"]'),
('Team Applied',          'Senior', 'Ghana', 'Coach Janet Asare',   'Engineering-first approach to every mission.',               '["Abena Mensah", "Kwesi Amoah", "Dzifa Tornu"]'),
('STEMR Seniors',         'Senior', 'Ghana', 'Coach Victor Quaye',  'The senior branch of the STEMR robotics program.',           '["Mawuli Agbeko", "Sena Ahiafor", "Yayra Klu"]'),
('Beta Gold-ST',          'Senior', 'Ghana', 'Coach Adwoa Sarpong', 'Consistent performers across all mission types.',            '["Kojo Antwi", "Akua Boamah", "Kwabena Opoku"]'),
('Fusion Innovators',     'Senior', 'Ghana', 'Coach Nii Lante Tei', 'High-scoring specialists in the irrigation missions.',       '["Nii Armah Ankrah", "Adaeze Okafor", "Kwame Poku"]'),
('Nanovolts',             'Senior', 'Ghana', 'Coach Harriet Boadu', 'Precision-focused team with a strong second round.',         '["Esi Asante", "Fiifi Mensah", "Abena Nyarko"]'),
('Novex',                 'Senior', 'Ghana', 'Coach James Ofori',   'Rookies turned podium contenders.',                          '["Darko Asiedu", "Linda Agyemang", "Prince Boateng"]'),
('ARIS Eagles Senior',    'Senior', 'Ghana', 'Coach Grace Acheampong','The senior chapter of the Eagles robotics dynasty.',        '["Kofi Acheampong", "Ama Owusu", "Kwesi Frimpong"]'),
('Rookies',               'Senior', 'Ghana', 'Coach Peter Asomah',  'First-time seniors with a bold strategy.',                   '["Nana Yaw Asomah", "Efua Danso", "Kwame Sarfo"]'),
('YCEM',                  'Senior', 'Ghana', 'Coach Comfort Tuffour','Youth Centre of Excellence Mechanicals.',                   '["Abena Tuffour", "Kofi Agyeman", "Ama Asante"]'),
('Mechatronics',          'Senior', 'Ghana', 'Coach Bright Asiedu', 'Cross-disciplinary team blending software and hardware.',    '["Femi Osei", "Akosua Boateng", "Kwabena Nkrumah"]'),
('Createch',              'Senior', 'Ghana', 'Coach Irene Amponsah','Creative problem-solvers with consistent scoring.',          '["Yaw Amponsah", "Abena Frimpong", "Kojo Owusu"]'),
('Masterminds',           'Senior', 'Ghana', 'Coach Solomon Boateng','Strategic thinkers and top qualifier contenders.',          '["Kwame Boateng", "Ama Darko", "Kofi Appiah"]'),
('AI Squad',              'Senior', 'Ghana', 'Coach Patience Mensah','Leveraging AI-inspired strategies on the mat.',             '["Esi Mensah", "Kwesi Darkwa", "Abena Osei"]'),
('The Problem Solvers',   'Senior', 'Ghana', 'Coach Anthony Quayson','They live up to the name — always find a way.',             '["Nana Asare", "Akua Quayson", "Yaw Acheampong"]'),
('Robosense',             'Senior', 'Ghana', 'Coach Felicia Tetteh', 'Sensor-heavy build philosophy, high reliability.',          '["Kofi Tetteh", "Ama Antwi", "Kwabena Frimpong"]'),
('Novotech',              'Senior', 'Ghana', 'Coach Daniel Amoako', 'Innovation-focused, first appearance this season.',          '["Akosua Amoako", "Yaw Boateng", "Nana Mensah"]'),
('Kepler-Robot',          'Senior', 'Ghana', 'Coach Emmanuel Darko', 'Named after Kepler''s laws — orbiting the top score.',      '["Kwame Darko", "Esi Boateng", "Kofi Osei"]'),

-- ── Junior Division (30 teams) ─────────────────────────────

('Kinderkids Robostars',  'Junior', 'Ghana', 'Coach Abena Quaye',   'The Robostars flagship junior squad.',                       '["Yaa Quaye", "Kweku Asante", "Akua Boateng"]'),
('Varified',              'Junior', 'Ghana', 'Coach Nana Asante',   'Meticulous builders, twice-verified before every run.',      '["Kofi Varify", "Ama Ansah", "Kwame Tetteh"]'),
('Bweh Trailblazers',     'Junior', 'Ghana', 'Coach Seth Agbedanu', 'Fearless trailblazers with a flair for surprise strategies.','["Setor Agbedanu", "Dzidzor Klu", "Edem Agbi"]'),
('Kinderkids Dream Builders','Junior','Ghana','Coach Cynthia Attah', 'Creative dreamers who build beyond expectations.',           '["Araba Attah", "Fiifi Asare", "Yaa Mensah"]'),
('Beta Gold-JT',          'Junior', 'Ghana', 'Coach Kweku Antwi',   'Junior counterpart of the Beta Gold robotics family.',       '["Kojo Antwi Jr", "Akua Frimpong", "Nana Boateng"]'),
('ACS Tech-Rangers',      'Junior', 'Ghana', 'Coach Ama Sarfo',     'Rangers known for fast autonomous sequences.',               '["Kwame Sarfo", "Abena Tetteh", "Kofi Agyemang"]'),
('Redeemer Innovators',   'Junior', 'Ghana', 'Coach Philip Adu',    'Innovation team from Redeemer''s junior program.',           '["Kwesi Adu", "Ama Ofori", "Yaw Boateng"]'),
('Quantum Minds',         'Junior', 'Ghana', 'Coach Linda Acheampong','Thinking on a quantum level since day one.',               '["Nana Acheampong", "Esi Mensah", "Kofi Darko"]'),
('Global Eagles',         'Junior', 'Ghana', 'Coach Francis Amponsah','Eyes on a global podium.',                                 '["Kwabena Amponsah", "Akosua Asante", "Yaw Frimpong"]'),
('Ahtoo Alpha Gold JT',   'Junior', 'Ghana', 'Coach Miriam Owusu',  'Junior chapter of the Alpha Gold dynasty.',                  '["Kwame Owusu", "Ama Appiah", "Kofi Ankrah"]'),
('Nexgen',                'Junior', 'Ghana', 'Coach Isaac Boateng', 'Next-generation builders with next-level precision.',        '["Elinam Boateng", "Kafui Asante", "Yaa Tetteh"]'),
('ACS Tech-Titans',       'Junior', 'Ghana', 'Coach Evelyn Nkrumah','Titans from the ACS Tech family.',                          '["Kwesi Nkrumah", "Abena Quaye", "Kojo Mensah"]'),
('The Queens',            'Junior', 'Ghana', 'Coach Adwoa Danso',   'All-female powerhouse, defending their crown.',              '["Ama Danso", "Akua Osei", "Yaa Acheampong"]'),
('Tech-Titans',           'Junior', 'Ghana', 'Coach George Asiedu', 'Titans with a trophy cabinet to match.',                    '["Kofi Asiedu", "Nana Boamah", "Esi Frimpong"]'),
('Legacy AI',             'Junior', 'Ghana', 'Coach Priscilla Tuffour','Building a legacy one mission at a time.',               '["Kwame Tuffour", "Ama Antwi", "Yaw Osei"]'),
('Glocity',               'Junior', 'Ghana', 'Coach Emmanuel Asare','Global city-builders with local heart.',                    '["Nana Asare Jr", "Akosua Quayson", "Kojo Agyeman"]'),
('Redeemer Builders',     'Junior', 'Ghana', 'Coach Comfort Mensah','Builders from the Redeemer''s junior ranks.',               '["Kwesi Mensah", "Esi Boateng", "Yaa Darko"]'),
('J2W Robotics Team',     'Junior', 'Ghana', 'Coach Joseph Owusu',  'Journey-to-Win philosophy drives every round.',             '["Akua Owusu", "Kofi Frimpong", "Ama Sarfo"]'),
('STEMR Juniors',         'Junior', 'Ghana', 'Coach Harriet Quaye', 'Junior division of the STEMR robotics program.',            '["Yaw Quaye", "Abena Antwi", "Kwame Asante"]'),
('Bytebots',              'Junior', 'Ghana', 'Coach Samuel Agyeman','Byte-sized bots, full-sized ambitions.',                    '["Nana Agyeman", "Esi Ofori", "Kojo Boateng"]'),
('Pro-Lego-Codex',        'Junior', 'Ghana', 'Coach Beatrice Darko','Legacies built one LEGO brick at a time.',                  '["Kwabena Darko", "Ama Tetteh", "Kofi Quaye"]'),
('Fearsom_Dragons',       'Junior', 'Ghana', 'Coach Victor Frimpong','Fire-breathing builds and fearless run strategies.',        '["Akosua Frimpong Jr", "Yaw Mensah", "Esi Appiah"]'),
('Guardian Lions',        'Junior', 'Ghana', 'Coach Janet Amoako',  'Guardians of the mat, lions in competition.',               '["Kwame Amoako", "Abena Osei", "Nana Antwi"]'),
('Vine Innovators',       'Junior', 'Ghana', 'Coach Anthony Tetteh','Growing vines, growing scores.',                            '["Kofi Tetteh Jr", "Ama Boamah", "Yaw Asante"]'),
('Grace Worriors',        'Junior', 'Ghana', 'Coach Grace Asomah',  'Warriors with grace — elegant yet powerful.',               '["Esi Asomah", "Kwesi Boateng", "Akua Mensah"]'),
('Vine Engineers',        'Junior', 'Ghana', 'Coach Patience Nkrumah','Engineers who let ideas grow organically.',               '["Nana Nkrumah", "Kojo Frimpong", "Ama Quaye"]'),
('Nexus Communicators',   'Junior', 'Ghana', 'Coach Irene Asante',  'Connecting strategy to execution, every round.',            '["Kwame Asante Jr", "Esi Darko", "Abena Amoako"]'),
('Mechminds',             'Junior', 'Ghana', 'Coach Solomon Owusu', 'Mechanical minds with digital precision.',                  '["Akosua Owusu Jr", "Yaw Tetteh", "Kofi Agyemang Jr"]'),
('WIOSO Intellectuals',   'Junior', 'Ghana', 'Coach Felicia Frimpong','Women in STEM, outstanding and unstoppable.',             '["Ama Frimpong", "Akua Asante Jr", "Nana Osei"]'),
('ARIS Eagles Junior',    'Junior', 'Ghana', 'Coach Daniel Acheampong','Junior Eagles soaring toward the championship.',         '["Kwesi Acheampong", "Esi Antwi", "Yaw Quayson"]');
