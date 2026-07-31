package com.notten.home.festival;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.IntStream;

/** Provides the festival details and highlight programs for the home page. */
@Service
public class FestivalService {

    private final Festival festival = new Festival(
            "낯선대학 10주년 축제",
            "과거를 기록하고, 현재를 연결하고, 미래를 확장하는 축제",
            "STRANGER UNIV. 10TH ANNIVERSARY",
            LocalDate.of(2026, 9, 12),
            LocalDate.of(2026, 9, 13));

    private final List<Program> highlights = List.of(
            new Program("오프닝 공연 — 인디 밴드 라이브", "공연", "9/12 12:00", "메인 스테이지"),
            new Program("핸드메이드 마켓", "부스", "9/12 11:00", "A구역 부스존"),
            new Program("도예 원데이 클래스", "체험", "9/12 14:00", "체험관 2층"),
            new Program("푸드트럭 존", "먹거리", "9/12 11:30", "야외 광장"),
            new Program("재즈 나이트", "공연", "9/12 19:00", "메인 스테이지"),
            new Program("클로징 불꽃놀이", "공연", "9/13 20:30", "야외 광장"));

    // Founding year of the festival; this year's edition is the 10th anniversary.
    private static final int FIRST_YEAR = 2016;

    // Detailed schedule by floor/zone. Slot hours are 24h; day: 0 = both, 1/2 = that day only.
    private final List<ScheduleZone> schedule = List.of(
            new ScheduleZone("1F", "교무처", "리셉션", "현장 운영", List.of(
                    new ScheduleZone.Slot(11, 21, "환대 & 오리엔테이션", 0))),
            new ScheduleZone("4F", "캠퍼스 낭만존", "공연", "심재욱, 김누림", List.of(
                    new ScheduleZone.Slot(11, 17, "보이는 라디오 (DJ부스)", 0),
                    new ScheduleZone.Slot(11, 17, "애장품 경매", 2),
                    new ScheduleZone.Slot(18, 21, "임팩트 있는 공연 (1~2팀)", 0))),
            new ScheduleZone("4F", "캠퍼스 낭만존", "마켓", "강다혜, 한정은, 문지현 · 운영총괄(부스협찬)", List.of(
                    new ScheduleZone.Slot(11, 14, "플리마켓(중고) · 비즈마켓(사업+홍보) · 간단 디저트", 0),
                    new ScheduleZone.Slot(14, 21, "협찬부스(술+먹거리) · 셀러 모집", 0))),
            new ScheduleZone("5F", "라이브러리 배움터", "사람책 · 취업박람회", "강다혜, 심재욱, 온은주", List.of(
                    new ScheduleZone.Slot(11, 14, "강연 30 + QnA 20 (6층 이동 후 1:1)", 0),
                    new ScheduleZone.Slot(14, 21, "낯대 추천인 사람책 발표 (흥미로운 주제)", 1),
                    new ScheduleZone.Slot(14, 21, "사람책 발표 (소속·직업 등, 외부 인용)", 2))),
            new ScheduleZone("6F", "네트워킹 존", "DJ", "심재욱, 김누림", List.of(
                    new ScheduleZone.Slot(11, 21, "6층 바이브 · 다양한 DJ 라인업", 0))),
            new ScheduleZone("6F", "네트워킹 존", "F&B", "강다혜, 한정은, 문지현 · 운영총괄(부스협찬)", List.of(
                    new ScheduleZone.Slot(11, 21, "협찬부스 (술+먹거리)", 0))),
            new ScheduleZone("4F~6F · 외부", "전시존", "전시", "김민수, 최근우", List.of(
                    new ScheduleZone.Slot(11, 21, "포토존 · 낯선대학 WALL · 가계도 · 사진전 · 원티드 게시판 · 공모전", 0))));

    // Whole-venue brackets that apply to every zone, each day.
    private final List<String> brackets = List.of(
            "08:00–11:00 현장 준비 및 사전 리허설",
            "22:00–23:00 현장 정리 및 행사 종료");

    public Festival festival() {
        return festival;
    }

    public List<Program> highlights() {
        return highlights;
    }

    /** The festival years from the first edition through this year, newest first. */
    public List<Edition> archives() {
        int thisYear = festival.startDate().getYear();
        List<Edition> editions = new ArrayList<>();
        for (int year = thisYear; year >= FIRST_YEAR; year--) {
            editions.add(new Edition(year, year == thisYear));
        }
        return editions;
    }

    /** Anniversary number for this year's edition (e.g. 10 for the 10주년). */
    public int anniversary() {
        return festival.startDate().getYear() - FIRST_YEAR;
    }

    /** Detailed schedule, one entry per floor/zone. */
    public List<ScheduleZone> schedule() {
        return schedule;
    }

    /** Date label for each festival day, e.g. ["9/12 (토)", "9/13 (일)"]. */
    public List<String> days() {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("M/d (E)", Locale.KOREAN);
        List<String> labels = new ArrayList<>();
        for (LocalDate d = festival.startDate(); !d.isAfter(festival.endDate()); d = d.plusDays(1)) {
            labels.add(d.format(fmt));
        }
        return labels;
    }

    /** Whole-venue time brackets (prep / teardown) shared by every zone. */
    public List<String> brackets() {
        return brackets;
    }

    /** Hour labels down the matrix time axis (11:00 … 20:00). */
    public List<Integer> hours() {
        return IntStream.range(Grid.START_HOUR, Grid.END_HOUR).boxed().toList();
    }

    /**
     * The schedule as a time × zone matrix for one day: each zone's slots are
     * filtered to that day and concurrent slots (same time range) merge into one
     * cell so nothing overlaps in the grid.
     */
    public List<Grid.Column> grid(int day) {
        List<Grid.Column> columns = new ArrayList<>();
        for (ScheduleZone z : schedule) {
            Map<List<Integer>, List<String>> byRange = new LinkedHashMap<>();
            for (ScheduleZone.Slot s : z.slots()) {
                if (s.on(day)) {
                    byRange.computeIfAbsent(List.of(s.start(), s.end()), k -> new ArrayList<>())
                            .add(s.content());
                }
            }
            List<Grid.Cell> cells = byRange.entrySet().stream()
                    .map(e -> new Grid.Cell(e.getKey().get(0), e.getKey().get(1), e.getValue()))
                    .toList();
            columns.add(new Grid.Column(z.floor(), z.zone(), z.category(), z.staff(), cells));
        }
        return columns;
    }
}
