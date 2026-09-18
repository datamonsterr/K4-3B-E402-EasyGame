-- Local synthetic seed only. These are fictitious identities and messages.
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003'),
 ('00000000-0000-0000-0000-000000000004');
set role service_role;
select public.import_pack(repeat('a',64),'synthetic-test', '[
 {"record_ordinal":1,"source_label":"duplicate","guild_label":"A","channel_label":"public","author_label":"human","is_bot":false,"message_type":"message","sent_at":"2026-09-18T00:00:00Z","content":"First","mentions_bot":false,"attachment_count":0,"source_char_count":5},
 {"record_ordinal":2,"source_label":"duplicate","guild_label":"A","channel_label":"staff","author_label":"human","is_bot":false,"message_type":"message","sent_at":"2026-09-18T00:00:00Z","content":"Second","mentions_bot":false,"attachment_count":0,"source_char_count":6},
 {"record_ordinal":3,"source_label":"ambiguous","guild_label":"A","channel_label":"public","author_label":"human","is_bot":false,"message_type":"reply","sent_at":"2026-09-18T00:01:00Z","content":"Third","mentions_bot":false,"attachment_count":0,"source_char_count":5,"reply_source_label":"duplicate"},
 {"record_ordinal":4,"source_label":"missing","guild_label":"A","channel_label":"public","author_label":"human","is_bot":false,"message_type":"reply","sent_at":"2026-09-18T00:02:00Z","content":"Fourth","mentions_bot":false,"attachment_count":0,"source_char_count":6,"reply_source_label":"absent"},
 {"record_ordinal":5,"source_label":"resolved","guild_label":"A","channel_label":"public","author_label":"bot","is_bot":true,"message_type":"reply","sent_at":"2026-09-18T00:03:00Z","content":"Fifth","mentions_bot":false,"attachment_count":0,"source_char_count":5,"reply_source_label":"missing"},
 {"record_ordinal":6,"source_label":"duplicate","guild_label":"B","channel_label":"public","author_label":"other","is_bot":false,"message_type":"message","sent_at":"2026-09-18T00:00:00Z","content":"Private guild","mentions_bot":false,"attachment_count":0,"source_char_count":13},
 {"record_ordinal":7,"source_label":"unknown","guild_label":"A","channel_label":"unknown","author_label":"human","is_bot":false,"message_type":"message","sent_at":"2026-09-18T00:00:00Z","content":"Uncurated","mentions_bot":false,"attachment_count":0,"source_char_count":9},
 {"record_ordinal":8,"source_label":"notice-lab1-orig","guild_label":"A","channel_label":"announcements","author_label":"coach_alice","is_bot":false,"message_type":"message","sent_at":"2026-09-17T14:00:00Z","content":"Thong bao: Thoi han nop bai Lab 1 la 21:00 ngay 17/09/2026 tren he thong LMS.","mentions_bot":false,"attachment_count":0,"source_char_count":79},
 {"record_ordinal":9,"source_label":"notice-lab1-ext","guild_label":"A","channel_label":"announcements","author_label":"coach_alice","is_bot":false,"message_type":"message","sent_at":"2026-09-19T05:00:00Z","content":"Gia han Lab 1: Thoi han nop bai Lab 1 duoc gia han den 12:00 ngay 19/09/2026.","mentions_bot":false,"attachment_count":0,"source_char_count":76},
 {"record_ordinal":10,"source_label":"notice-attendance","guild_label":"A","channel_label":"announcements","author_label":"coach_alice","is_bot":false,"message_type":"message","sent_at":"2026-09-15T02:00:00Z","content":"Quy che diem danh: Sinh vien can tham gia toi thieu 80 phan tram so buoi workshop.","mentions_bot":false,"attachment_count":0,"source_char_count":80},
 {"record_ordinal":11,"source_label":"notice-cvat","guild_label":"A","channel_label":"announcements","author_label":"coach_alice","is_bot":false,"message_type":"message","sent_at":"2026-09-16T03:00:00Z","content":"Huong dan CVAT: Khoi chay docker compose up -d de bat dau gan nhan du lieu.","mentions_bot":false,"attachment_count":0,"source_char_count":76},
 {"record_ordinal":12,"source_label":"q-urgent-overdue","guild_label":"A","channel_label":"q-and-a","author_label":"student_bob","is_bot":false,"message_type":"message","sent_at":"2026-09-18T07:00:00Z","content":"CVAT container bao loi HTTP 500 khi import dataset, nho Lab Coach ho tro gap!","mentions_bot":false,"attachment_count":0,"source_char_count":77},
 {"record_ordinal":13,"source_label":"q-warning-overdue","guild_label":"A","channel_label":"q-and-a","author_label":"student_charlie","is_bot":false,"message_type":"message","sent_at":"2026-09-18T09:30:00Z","content":"Em muon hoi ve quy dinh nop tre bai Lab 1 thi bi tru bao nhieu phan tram diem a?","mentions_bot":false,"attachment_count":0,"source_char_count":79},
 {"record_ordinal":14,"source_label":"q-fresh-open","guild_label":"A","channel_label":"q-and-a","author_label":"student_david","is_bot":false,"message_type":"message","sent_at":"2026-09-18T11:45:00Z","content":"Cho em hoi link tai pretrained weights cho model YOLOv8 o dau a?","mentions_bot":false,"attachment_count":0,"source_char_count":63},
 {"record_ordinal":15,"source_label":"q-claimed","guild_label":"A","channel_label":"q-and-a","author_label":"student_eve","is_bot":false,"message_type":"message","sent_at":"2026-09-18T09:00:00Z","content":"Tai khoan CVAT cua nhom em bi loi khong the invite thanh vien khac vao project.","mentions_bot":false,"attachment_count":0,"source_char_count":79},
 {"record_ordinal":16,"source_label":"q-answered","guild_label":"A","channel_label":"discussion","author_label":"student_frank","is_bot":false,"message_type":"message","sent_at":"2026-09-18T08:00:00Z","content":"Buoi thuc hanh thu 6 nay co bat buoc mang theo laptop ca nhan khong a?","mentions_bot":false,"attachment_count":0,"source_char_count":69},
 {"record_ordinal":17,"source_label":"q-resolved","guild_label":"A","channel_label":"discussion","author_label":"student_grace","is_bot":false,"message_type":"message","sent_at":"2026-09-18T06:00:00Z","content":"Em da tim thay thu muc nop bai tren Google Drive roi, cam on anh chi!","mentions_bot":false,"attachment_count":0,"source_char_count":68}
 ]'::jsonb);
reset role;
update public.channels set visibility=source_label where source_label in ('public','staff');
update public.channels set visibility='public' where source_label in ('announcements','discussion','q-and-a');
update public.channels set visibility='staff' where source_label in ('ta-radar');
update public.channels set display_name = '#' || source_label;
insert into public.channels(guild_id, source_label, display_name, visibility)
select id, 'ta-radar', '#ta-radar', 'staff' from public.guilds where source_label='A'
on conflict (guild_id, source_label) do update set display_name='#ta-radar', visibility='staff';

insert into public.memberships(guild_id,user_id,role)
select id, '00000000-0000-0000-0000-000000000001', 'learner' from public.guilds where source_label='A';
insert into public.memberships(guild_id,user_id,role)
select id, '00000000-0000-0000-0000-000000000002', 'lab_coach' from public.guilds where source_label='A';
insert into public.memberships(guild_id,user_id,role)
select id, '00000000-0000-0000-0000-000000000003', 'lab_coach' from public.guilds where source_label='A';
insert into public.memberships(guild_id,user_id,role)
select id, '00000000-0000-0000-0000-000000000004', 'learner' from public.guilds where source_label='B';

insert into public.questions(id,guild_id,message_id,intent)
select '10000000-0000-0000-0000-000000000001',guild_id,id,'synthetic' from public.source_messages where record_ordinal=1;

-- Rich mock notices
insert into public.notices(id, guild_id, message_id, topic_key, verified_by, published_at, answer_excerpt)
select '40000000-0000-0000-0000-000000000001', guild_id, id, 'lab-1', '00000000-0000-0000-0000-000000000002', '2026-09-17T14:00:00Z', 'Lab 1 original deadline is 21:00 on September 17, 2026.'
from public.source_messages where record_ordinal=8;

insert into public.notices(id, guild_id, message_id, topic_key, verified_by, published_at, answer_excerpt)
select '40000000-0000-0000-0000-000000000002', guild_id, id, 'lab-1', '00000000-0000-0000-0000-000000000002', '2026-09-19T05:00:00Z', 'Lab 1 deadline is extended to 12:00 on September 19, 2026.'
from public.source_messages where record_ordinal=9;

insert into public.notices(id, guild_id, message_id, topic_key, verified_by, published_at, answer_excerpt)
select '40000000-0000-0000-0000-000000000003', guild_id, id, 'attendance', '00000000-0000-0000-0000-000000000002', '2026-09-15T02:00:00Z', 'Attendance policy requires at least 80% workshop presence.'
from public.source_messages where record_ordinal=10;

insert into public.notices(id, guild_id, message_id, topic_key, verified_by, published_at, answer_excerpt)
select '40000000-0000-0000-0000-000000000004', guild_id, id, 'cvat', '00000000-0000-0000-0000-000000000002', '2026-09-16T03:00:00Z', 'CVAT setup guide: run docker compose up -d with provided override file.'
from public.source_messages where record_ordinal=11;

-- Rich mock questions
insert into public.questions(id, guild_id, message_id, intent, status)
select '30000000-0000-0000-0000-000000000001', guild_id, id, 'cvat-error-500', 'open'
from public.source_messages where record_ordinal=12;

insert into public.questions(id, guild_id, message_id, intent, status)
select '30000000-0000-0000-0000-000000000002', guild_id, id, 'lab-1-late-penalty', 'open'
from public.source_messages where record_ordinal=13;

insert into public.questions(id, guild_id, message_id, intent, status)
select '30000000-0000-0000-0000-000000000003', guild_id, id, 'yolov8-weights', 'open'
from public.source_messages where record_ordinal=14;

insert into public.questions(id, guild_id, message_id, intent, status, claimed_by)
select '30000000-0000-0000-0000-000000000004', guild_id, id, 'cvat-invite-error', 'claimed', '00000000-0000-0000-0000-000000000002'
from public.source_messages where record_ordinal=15;

insert into public.questions(id, guild_id, message_id, intent, status)
select '30000000-0000-0000-0000-000000000005', guild_id, id, 'workshop-laptop-req', 'answered'
from public.source_messages where record_ordinal=16;

insert into public.questions(id, guild_id, message_id, intent, status, resolved_at)
select '30000000-0000-0000-0000-000000000006', guild_id, id, 'drive-folder-location', 'resolved', '2026-09-18T08:00:00Z'
from public.source_messages where record_ordinal=17;

insert into public.assistant_runs(id,guild_id,actor_id,status,artifact_version,latency_ms,decision_summary)
select '20000000-0000-0000-0000-000000000001',id,'00000000-0000-0000-0000-000000000001','fallback','v0',1,'No verified evidence' from public.guilds where source_label='A';
insert into public.assistant_runs(id,guild_id,actor_id,status,artifact_version,latency_ms,decision_summary)
select '20000000-0000-0000-0000-000000000002',id,'00000000-0000-0000-0000-000000000003','fallback','v0',1,'No verified evidence' from public.guilds where source_label='A';
insert into public.run_events(run_id,sequence,event_type,summary) values
 ('20000000-0000-0000-0000-000000000001',0,'result','Fallback'),
 ('20000000-0000-0000-0000-000000000002',0,'result','Fallback');
update public.datasets set source_kind='synthetic' where sha256=repeat('a',64);
