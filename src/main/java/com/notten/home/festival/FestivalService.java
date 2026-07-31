package com.notten.home.festival;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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
}
