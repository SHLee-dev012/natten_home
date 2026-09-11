-- 명단에 코드 칸을 더한다 — Supabase SQL Editor 에 붙여넣고 실행하세요.
-- 두 번 실행해도 안전합니다.
--
-- 코드는 바깥에서 이미 정해져 온다. 여기서 만들지 않고 받아 담기만 한다.
-- 다음 CSV 올리기 때 code 칸을 함께 실으면 그대로 들어간다.

alter table public.roster add column if not exists code text;

-- 앞뒤 공백은 미리 털어 둔다. 사람이 옮겨 적거나 엑셀을 거치면 눈에 안 보이는
-- 공백이 붙는데, 그대로 두면 접수대에서 검색이 안 되고 유일성도 어긋난다.
update public.roster
   set code = nullif(btrim(code), '')
 where code is distinct from nullif(btrim(code), '');

-- 공백만 든 코드, 앞뒤 공백이 붙은 코드를 막는다.
-- 빈 문자열('')을 함께 허용하는 것은 CSV 때문이다. 빈 칸이 NULL 이 아니라
-- '' 로 들어오는 일이 있는데, 그때 가져오기 전체가 실패하면 곤란하다.
alter table public.roster drop constraint if exists roster_code_chk;
alter table public.roster add constraint roster_code_chk
    check (code is null or code = '' or code = btrim(code));

-- 코드는 사람마다 달라야 한다. 다만 아직 코드가 없는 줄이 많으므로
-- 값이 있는 줄만 본다(부분 색인). NULL 은 서로 겹치는 것으로 치지 않지만
-- '' 는 겹치므로, 빈 문자열도 함께 빼야 한다.
drop index if exists roster_code_uniq;
create unique index roster_code_uniq
    on public.roster (code)
 where code is not null and code <> '';

-- 대소문자는 구분한다. 코드 형식을 아직 모르므로 규칙을 좁히지 않는다.
-- 'A1' 과 'a1' 을 같은 것으로 보고 싶으면 위 색인을 지우고 아래를 쓰세요.
--   create unique index roster_code_uniq
--       on public.roster (upper(code))
--    where code is not null and code <> '';

-- ── 올리기 전에 확인 ──────────────────────────────────────────────────
-- CSV 안에 같은 코드가 두 번 있으면 가져오기가 통째로 실패한다. 미리 본다.
--   select code, count(*) from public.roster
--    where code is not null and code <> ''
--    group by code having count(*) > 1;
--
-- 대소문자만 다른 코드가 섞였는지 (색인은 이것을 막지 않는다)
--   select upper(code), count(*) from public.roster
--    where code is not null and code <> ''
--    group by upper(code) having count(*) > 1;
--
-- 코드가 아직 없는 사람이 몇인지
--   select count(*) from public.roster where code is null or code = '';
