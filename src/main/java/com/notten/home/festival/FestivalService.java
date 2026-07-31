package com.notten.home.festival;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/** Provides the festival details and highlight programs for the home page. */
@Service
public class FestivalService {

    private final Festival festival = new Festival(
            "notten 페스티벌",
            "밤하늘 아래, 오프라인으로 만나는 축제의 순간",
            "한강 노들섬 일대",
            LocalDate.of(2026, 7, 25),
            LocalDate.of(2026, 7, 26));

    private final List<Program> highlights = List.of(
            new Program("오프닝 공연 — 인디 밴드 라이브", "공연", "7/25 12:00", "메인 스테이지"),
            new Program("핸드메이드 마켓", "부스", "7/25 11:00", "A구역 부스존"),
            new Program("도예 원데이 클래스", "체험", "7/25 14:00", "체험관 2층"),
            new Program("푸드트럭 존", "먹거리", "7/25 11:30", "야외 광장"),
            new Program("재즈 나이트", "공연", "7/25 19:00", "메인 스테이지"),
            new Program("클로징 불꽃놀이", "공연", "7/26 20:30", "야외 광장"));

    public Festival festival() {
        return festival;
    }

    public List<Program> highlights() {
        return highlights;
    }
}
