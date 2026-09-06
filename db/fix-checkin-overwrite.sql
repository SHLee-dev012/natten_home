-- 체크인 시각이 덮어써지는 문제를 고친다.
--
-- 원인
--   접수대에 여러 명이 서면 누군가의 화면은 늘 몇 초쯤 낡아 있다.
--   화면의 체크인 단추는 자기가 들고 있는 값만 보고 방향을 정하므로
--   (checked_in_at 이 비어 있으면 "체크인", 차 있으면 "되돌리기"),
--   낡은 화면에서는 이미 찍힌 사람에게 p_on = true 를 한 번 더 보낸다.
--   기존 함수는 조건 없이 now() 를 넣어, 먼저 기록된 도착 시각이 지워졌다.
--
-- 고침
--   coalesce 로 첫 시각을 지킨다. 되돌리기(p_on = false)는 그대로 지운다.
--   함수만 바꾸므로 명단 데이터는 건드리지 않는다.

create or replace function public.set_check_in(p_id bigint, p_on boolean)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
    v_at timestamptz;
begin
    if not public.is_admin() then
        raise exception 'not an admin' using errcode = '42501';
    end if;

    update public.roster
       set checked_in_at = case
               when p_on then coalesce(checked_in_at, now())
               else null
           end
     where id = p_id
    returning checked_in_at into v_at;

    if not found then
        raise exception 'no such row' using errcode = 'P0002';
    end if;

    return v_at;
end;
$$;

grant execute on function public.set_check_in(bigint, boolean) to authenticated;

-- 확인용. 함수가 바뀌었는지 한 줄로 나온다.
select
    (select count(*) from public.roster)                            as 명단_행수,
    (select count(*) from public.roster where checked_in_at is not null) as 체크인_인원,
    (select prosrc like '%coalesce(checked_in_at, now())%'
       from pg_proc where proname = 'set_check_in')                 as 덮어쓰기_막혔나;
