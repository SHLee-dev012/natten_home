-- 관리자 명단 — Supabase 쪽 설정
--
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행하세요.
-- 두 번 실행해도 안전합니다(전부 if not exists / drop 후 재생성).
--
-- 핵심은 하나입니다. 이 표는 anon 키로 절대 읽히지 않습니다.
-- 게시판(posts)이 쓰는 anon 키는 소스에 공개돼 있으므로, 명단은 로그인해서
-- 받은 토큰으로만 열립니다. 권한 판단은 브라우저가 아니라 DB가 합니다.

-- ── 1. 누가 관리자인가 ────────────────────────────────────────────────
-- 로그인만 하면 다 보이면 안 된다. 여기 적힌 이메일만 명단을 읽는다.
create table if not exists public.admin_emails (
    email text primary key,
    note  text,
    added_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
-- 이 표 자체는 아무도 못 읽는다. 아래 정책이 서버 안에서만 참조한다.
drop policy if exists "admin_emails: 접근 금지" on public.admin_emails;
create policy "admin_emails: 접근 금지"
    on public.admin_emails for all
    using (false) with check (false);

-- 관리자 계정을 여기에 넣으세요. Supabase Auth 에 만든 계정과 같아야 합니다.
-- /admin 화면은 아이디만 받고 뒤에 @knotsun.kr 을 붙이므로, 'admin' 으로
-- 로그인하려면 여기와 Auth 양쪽 모두 admin@knotsun.kr 이어야 합니다.
-- insert into public.admin_emails (email, note)
-- values ('admin@knotsun.kr', '총감독')
-- on conflict (email) do nothing;


-- ── 2. 명단 표 ────────────────────────────────────────────────────────
-- 칸은 필요에 맞게 고치세요. /admin 페이지는 돌아온 칸을 그대로 그리므로
-- 여기서 칸을 더하거나 빼도 화면 코드를 손댈 필요가 없습니다.
--
-- 연락처·이메일·주소는 넣지 마세요. 전화는 뒤 4자리(phone_last4)만 둡니다.
-- 동명이인을 가르는 데는 그것으로 충분하고, 4자리만으로는 연락이 되지 않아
-- 만에 하나 새더라도 피해가 작습니다. 담기지 않은 정보는 샐 수도 없습니다.
create table if not exists public.roster (
    id          bigint generated always as identity primary key,
    name        text not null,         -- 이름
    cohort      text,                  -- 기수 (낯5, 낯C3 …)
    kind        text,                  -- 구분 (출석후원 / 동문후원 …)
    day_qty     integer,               -- 일출권 매수
    all_qty     integer,               -- 올출권 매수
    drink_qty   integer,               -- 음료권 매수
    food_qty    integer,               -- 푸드권 매수
    phone_last4 text,                  -- 전화 뒤 4자리 (동명이인 가릴 때만)
    applied_on  date,                  -- 신청일
    memo        text,                  -- 비고
    created_at  timestamptz not null default now()
);

-- 이미 만든 표에도 칸을 더한다(두 번 돌려도 안전).
-- 나중에 더한 칸은 표 맨 뒤에 붙지만, 화면은 admin.js 의 ORDER 가 정한
-- 차례로 그리므로 매수·음료권이 구분 옆에 나온다.
alter table public.roster add column if not exists phone_last4 text;
alter table public.roster add column if not exists day_qty     integer;
alter table public.roster add column if not exists all_qty     integer;
alter table public.roster add column if not exists drink_qty   integer;
alter table public.roster add column if not exists food_qty    integer;

-- 티켓을 매수 한 칸(ticket_qty)으로 두었다가 일출권·올출권으로 나눴다.
-- 앞 판을 이미 돌린 표가 있으면 값을 일출권으로 옮기고 옛 칸을 없앤다.
-- 없는 표에서는 아무 일도 하지 않는다.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'roster'
          and column_name = 'ticket_qty'
    ) then
        execute 'update public.roster set day_qty = coalesce(day_qty, ticket_qty)';
        execute 'alter table public.roster drop column ticket_qty';
    end if;
end $$;

-- 음수는 있을 수 없다.
alter table public.roster drop constraint if exists roster_qty_chk;
alter table public.roster add constraint roster_qty_chk
    check ((day_qty   is null or day_qty   >= 0)
       and (all_qty   is null or all_qty   >= 0)
       and (drink_qty is null or drink_qty >= 0)
       and (food_qty  is null or food_qty  >= 0));

-- 뒤 4자리만 담기게 못박는다. 실수로 전체 번호를 붙여넣으면 여기서 걸린다.
alter table public.roster drop constraint if exists roster_phone_last4_chk;
alter table public.roster add constraint roster_phone_last4_chk
    check (phone_last4 is null or phone_last4 = '' or phone_last4 ~ '^[0-9]{4}$');
-- 빈 문자열을 함께 허용한 것은 CSV 가져오기 때문이다. 빈 칸이 NULL 이 아니라
-- '' 로 들어오는 경우가 있는데, 그때 가져오기 전체가 실패하면 곤란하다.

alter table public.roster enable row level security;

-- 읽기: 로그인했고, 그 이메일이 admin_emails 에 있을 때만.
drop policy if exists "roster: 관리자만 읽기" on public.roster;
create policy "roster: 관리자만 읽기"
    on public.roster for select
    to authenticated
    using (
        exists (
            select 1 from public.admin_emails a
            where lower(a.email) = lower(auth.jwt() ->> 'email')
        )
    );

-- 쓰기 정책은 두지 않는다. 정책이 없으면 RLS 아래에서는 아무도 못 쓴다.
-- 명단 넣기는 대시보드(Table Editor / CSV 가져오기)에서 하세요. 대시보드는
-- service_role 로 붙으므로 RLS 를 지나갑니다.

-- 다만 정책이 없는 것만으로는 응답이 어정쩡하다. 표 단위 쓰기 권한이 남아
-- 있으면 PostgREST 가 401 이 아니라 204(No Content)를 돌려준다. RLS 가 행을
-- 다 가려 0건이 처리된 것이라 실제로 바뀌는 것은 없지만, "성공했다"로 읽혀
-- 지워졌는지 걱정하게 된다. 권한 자체를 걷어 401 로 딱 잘리게 한다.
revoke insert, update, delete on public.roster from anon, authenticated;

-- admin_emails 의 select 권한은 건드리지 않는다.
-- 위 roster 정책이 이 표를 읽어 관리자인지 가린다. authenticated 에게서
-- select 를 뺏으면 정책을 평가하다 권한 오류가 나서 관리자까지 명단을 못
-- 보게 될 수 있다. 이 표는 RLS 로 이미 잠겨 있어(정책 using(false)) 바깥에서
-- 내용을 읽어갈 수 없으므로, 권한까지 뺏을 실익이 없다.
revoke insert, update, delete on public.admin_emails from anon, authenticated;

-- 이름으로 자주 찾으므로 색인 하나.
create index if not exists roster_name_idx on public.roster (name);


-- ── 3. 확인 ───────────────────────────────────────────────────────────
-- 아래를 SQL Editor 에서 돌리면 RLS 가 켜져 있는지 볼 수 있습니다.
--   select relname, relrowsecurity from pg_class
--   where relname in ('roster', 'admin_emails');
-- 둘 다 relrowsecurity = true 여야 합니다.
--
-- anon 키로 정말 막히는지는 터미널에서 확인하는 게 확실합니다.
--   curl -s "https://<프로젝트>.supabase.co/rest/v1/roster?select=*" \
--        -H "apikey: <anon 키>" -H "Authorization: Bearer <anon 키>"
-- 빈 배열 [] 이 나와야 정상입니다(행이 있어도 안 보여야 합니다).


-- ── 4. 잊지 말 것 ─────────────────────────────────────────────────────
-- Supabase 대시보드 > Authentication > Sign In / Providers 에서
-- "Allow new users to sign up" 을 꺼두세요.
-- 켜져 있으면 누구나 계정을 만들 수 있습니다. 그 계정으로 명단이 보이지는
-- 않지만(admin_emails 에 없으므로), 계정을 열어둘 이유가 없습니다.
-- 관리자 계정은 Authentication > Users > Add user 로 직접 만드세요.
