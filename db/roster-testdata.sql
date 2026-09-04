-- 후원자 명단 — 시험용 데이터
--
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- 대시보드는 service_role 로 붙으므로 RLS 와 revoke 를 지나갑니다.
--
-- 실데이터와 섞이므로 memo 에 __TEST__ 표시를 박아 둡니다. 다 보시고 나면
-- 이 파일 맨 아래의 지우기 한 줄로 깨끗이 걷어낼 수 있습니다.
--
-- 화면에서 확인할 거리를 일부러 골라 넣었습니다.
--   동명이인 둘        김하늘 3117 / 김하늘 8402  -> 전화 뒤 4자리로 갈리는지
--   앞자리 0           0713               -> 엑셀에서 0 이 날아가지 않았는지
--   전화 없음          NULL               -> 빈 칸이 표에서 깨지지 않는지
--   체크인 됨/안 됨    섞어 둠            -> 초록 시각과 테두리 단추가 갈리는지
--   매수 0 과 여러 장  섞어 둠            -> 합계가 맞는지

insert into public.roster
    (name,     phone_last4, kind,       day_qty, all_qty, drink_qty, food_qty, cohort,  memo,       checked_in_at)
values
    ('김하늘', '3117',      '출석후원',  2,       0,       2,         1,        '낯5',   '__TEST__', null),
    ('김하늘', '8402',      '동문후원',  0,       1,       0,         2,        '낯C3',  '__TEST__', now() - interval '40 minutes'),
    ('박서준', '0713',      '출석후원',  1,       1,       3,         0,        '낯Y8',  '__TEST__', null),
    ('이도윤', null,        '출석후원',  4,       0,       4,         4,        '낯2',   '__TEST__', now() - interval '2 hours'),
    ('최지우', '9047',      '동문후원',  0,       2,       1,         2,        '낯C2',  '__TEST__', null),
    ('정민재', '5580',      '출석후원',  1,       0,       1,         1,        '낯7',   '__TEST__', null),
    ('한소희', '6621',      '출석후원',  3,       1,       2,         3,        '낯Y1',  '__TEST__', now() - interval '15 minutes'),
    ('오유진', '4408',      '동문후원',  0,       0,       0,         0,        '낯9',   '__TEST__', null);

-- 넣은 것 확인 (SQL Editor 에서는 RLS 를 지나가므로 그대로 보입니다)
select name, phone_last4, kind, day_qty, all_qty, drink_qty, food_qty, cohort,
       checked_in_at
  from public.roster
 where memo = '__TEST__'
 order by name;

-- 합계가 화면과 맞는지 대조할 때 쓰세요.
--   일출권 11 · 올출권 5 · 음료권 13 · 푸드권 13 · 8명 · 체크인 3명
select count(*)                                  as 인원,
       sum(day_qty)                              as 일출권,
       sum(all_qty)                              as 올출권,
       sum(drink_qty)                            as 음료권,
       sum(food_qty)                             as 푸드권,
       count(*) filter (where checked_in_at is not null) as 체크인
  from public.roster
 where memo = '__TEST__';


-- ── 다 보셨으면 지우기 ────────────────────────────────────────────────
-- 아래 한 줄만 따로 실행하면 시험 데이터만 사라지고 실데이터는 그대로입니다.
--
--   delete from public.roster where memo = '__TEST__';
