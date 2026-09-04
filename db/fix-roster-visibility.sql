-- 후원자 명단이 관리자에게도 0 건으로 보이던 문제를 고친다.
--
-- 원인
--   roster 의 읽기 정책이 admin_emails 를 하위 질의로 조회했다.
--   그런데 정책의 하위 질의도 '부르는 사람' 권한으로 실행되므로
--   admin_emails 의 RLS 를 다시 통과해야 한다. admin_emails 에는
--   using(false) 정책이 걸려 있어 아무 줄도 보이지 않는다.
--   따라서 exists(...) 가 늘 거짓이 되고, 관리자로 로그인해도 0 건을 받는다.
--   권한 오류가 아니라 '빈 표'로 보이기 때문에 원인이 드러나지 않았다.
--
-- 고침
--   판정을 security definer 함수로 옮겨 함수 주인의 권한으로 조회하게 한다.
--   함수가 하는 일은 "이 이메일이 목록에 있는가" 하나뿐이라 다른 것은 새지 않는다.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.admin_emails a
        where lower(a.email) = lower(auth.jwt() ->> 'email')
    );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "roster: 관리자만 읽기" on public.roster;
create policy "roster: 관리자만 읽기"
    on public.roster for select
    to authenticated
    using (public.is_admin());

-- 확인. 세 값이 한 줄로 나온다.
select
    (select count(*) from public.roster)                              as 명단_행수,
    (select count(*) from public.admin_emails)                        as 관리자_수,
    (select exists (select 1 from public.admin_emails a
                    where lower(a.email) = lower('admin@knotsun.kr'))) as 계정_등록됨;
