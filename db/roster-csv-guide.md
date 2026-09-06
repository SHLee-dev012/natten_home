# 후원자 명단 CSV 올리기

관리자 화면(`knotsun.kr/admin`)에는 업로드 기능이 없다. 읽기와 체크인만 한다.
명단은 **Supabase 대시보드**로 올린다.

## 1. 템플릿

`db/roster-template.csv`

```csv
name,phone_last4,kind,day_qty,all_qty,drink_qty,food_qty,cohort
홍길동,4821,출석후원,2,0,2,1,낯5
김낯선,0713,동문후원,0,1,0,2,낯C3
이대학,,출석후원,1,1,3,0,낯Y8
```

| 칸 | 뜻 | 비고 |
|---|---|---|
| `name` | 이름 | **반드시 있어야 한다.** 비면 그 줄은 들어가지 않는다 |
| `phone_last4` | 전화 뒤 4자리 | 동명이인을 가릴 때만 쓴다. 비워도 된다 |
| `kind` | 구분 | 출석후원 / 동문후원 … 정해진 값이 아니라 적은 그대로 들어간다 |
| `day_qty` | 일출권 매수 | 숫자 |
| `all_qty` | 올출권 매수 | 숫자 |
| `drink_qty` | 음료권 매수 | 숫자 |
| `food_qty` | 푸드권 매수 | 숫자 |
| `cohort` | 기수 | 낯5, 낯C3, 낯Y8 … |

**넣지 말 것**

- `id` — 데이터베이스가 스스로 매긴다. 넣으면 오류가 난다
- `checked_in_at` — 축제 당일 체크인할 때 채워진다

## 2. 올리는 곳

Supabase 대시보드 → **Table Editor** → `roster` 표 →
오른쪽 위 **Insert** → **Import data from CSV**

## 3. 걸리기 쉬운 것 셋

### 한글이 깨진다
엑셀에서 그냥 저장하면 윈도우에서는 CP949 로 저장돼 Supabase 에서 한글이
깨진다. 둘 중 하나로 한다.

- **구글 시트**에서 만들고 `파일 → 다운로드 → 쉼표로 구분된 값(.csv)`
  (항상 UTF-8 이라 가장 안전하다)
- 엑셀이면 저장할 때 형식을 **`CSV UTF-8(쉼표로 분리)`** 로 고른다

### 전화 뒤 4자리 앞의 0이 사라진다
엑셀이 `0713` 을 숫자 713 으로 바꾼다. 그러면 조회할 때 안 걸린다.

- 그 칸을 **텍스트 서식**으로 먼저 바꾸거나
- 값 앞에 홑따옴표를 붙여 `'0713` 으로 적는다

### 빈 칸은 0 이 아니라 '없음'이 된다
`day_qty` 를 비우면 0 이 아니라 NULL 로 들어가 화면에 빈칸으로 나온다.
0 으로 보이길 원하면 **0 이라고 적는다.**

## 4. 다시 올릴 때

Import 는 **덧붙이기**다. 같은 파일을 두 번 올리면 두 벌이 들어간다.
갈아엎으려면 먼저 지운다.

```sql
-- 주의: 체크인 기록까지 같이 사라진다. 축제 당일에는 쓰지 말 것.
delete from public.roster;
```

시험 데이터만 지우려면

```sql
delete from public.roster where memo = '__TEST__';
```

## 5. 올린 뒤 확인

```sql
select count(*) as 명단_행수,
       count(*) filter (where name is null or name = '') as 이름_빈줄,
       count(*) filter (where phone_last4 is not null
                          and length(phone_last4) <> 4)  as 전화뒤4_이상한줄
from public.roster;
```

그리고 `knotsun.kr/admin` 에 로그인해 **조회 옆 인원 수**가 올린 수와 같은지 본다.
