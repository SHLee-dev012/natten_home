package com.notten.home.festival;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Provides the festival details and programs, served as JSON by the festival API.
 *
 * <p>The home page (templates/index.html) is the source of truth for this content —
 * it renders its own hard-coded markup and does not read this service. Keep the
 * values below in sync with the 축제개요 · 일정표 · 오시는 길 sections there.
 */
@Service
public class FestivalService {

    private final Festival festival = new Festival(
            "낯선대학 10주년 축제",
            "이런 학기, 처음이지?",
            "STRANGER UNIV. — 10TH ANNIVERSARY FESTIVAL",
            LocalDate.of(2026, 9, 12),
            LocalDate.of(2026, 9, 13));

    private final Venue venue = new Venue(
            "사유의서재 남산",
            "서울 중구 퇴계로20길 13, 4층",
            List.of("1F 학생처", "4F 캠퍼스낭만존", "5F 도서관", "6F 옥상광장"),
            "https://naver.me/xQe26Aqr");

    // Schedule by floor/zone, matching the 일정표 tabs. day: 0 = both, 1 = 토, 2 = 일.
    private final List<ScheduleZone> schedule = List.of(
            new ScheduleZone("1F", "학생처", "리셉션", List.of(
                    new ScheduleZone.Slot("상시", "리셉션 입장 & 학생증·코인 발급", 0,
                            "입학안내부터 축제 전용 코인까지, 낯대 축제의 첫 관문. 1층 리셉션 데스크에서 후원명단을 확인하고 입장하면서 학생증과 축제 전용 코인을 발급받습니다."))),
            new ScheduleZone("4F", "캠퍼스낭만존", "캠퍼스라이프", List.of(
                    new ScheduleZone.Slot("13:00–19:00", "낯선마켓 (F&B·플리마켓)", 0,
                            "동문 셀러들이 준비한 다양한 먹거리와 즐길거리. 축제 코인으로 즐기는 낯선 마켓을 만나보세요."),
                    new ScheduleZone.Slot("17:30–18:30", "낯선라디오 공개방송", 0,
                            "캠퍼스 방송국이 명동 현장으로 나옵니다. 실시간 사연 신청, 낯선 라이브 마켓, 현장의 열기를 담은 특별 이벤트."),
                    new ScheduleZone.Slot("19:00–20:30", "낯선별밤", 1,
                            "10년의 감성이 폭발하는 밤. 오직 동문들만을 위한 특별한 라이브 무대가 펼쳐집니다."),
                    new ScheduleZone.Slot("20:30–22:00", "낯선파티", 1,
                            "오늘 밤이 아쉬운 자여, DJ의 음악과 함께 즐겨라. 낯선대학 DJ 파티."))),
            new ScheduleZone("5F", "도서관", "진리탐구", List.of(
                    new ScheduleZone.Slot("시간 추후 확정", "동문특강 · 사람책 (토요일 8강)", 1,
                            "1,000명에게 다시 듣고 싶은 사람책 강의를 물었습니다. 10년 중 가장 기억에 남았던 8인의 이야기를 다시 듣습니다."),
                    new ScheduleZone.Slot("시간 추후 확정", "동문특강 · 사람책 (일요일 4강)", 2,
                            "동문들이 먼저 걸어본 낯선 진로의 갈림길을 나누는 일요일 4강. 강의가 끝나면 Q&A와 네트워킹 시간이 이어집니다."),
                    new ScheduleZone.Slot("13:00–19:00", "졸업앨범 · 낯텐 사진공모전 전시", 0,
                            "1기부터 최신 기수까지 10년치 사진을 시간순으로 이어붙인 졸업앨범 아카이브와, 응모작 약 50여 점을 전시하는 낯텐 사진공모전."),
                    new ScheduleZone.Slot("18:00–19:00", "뿌리를 찾아서 · 창립자 토크콘서트", 2,
                            "단 7명이 시작했던 낯선대학, 10년 뒤 1,000명의 우주가 되었습니다. 낯선대학 시초 7인이 처음으로 한자리에 모이는 토크콘서트."))),
            new ScheduleZone("6F", "옥상광장", "우정과 사랑", List.of(
                    new ScheduleZone.Slot("상시", "동문 네트워킹 라운지", 0,
                            "도심 속 남산타워가 한눈에 보이는 오픈 루프탑. 반가운 동문들과 잔을 기울이는 프라이빗 네트워킹 공간."))));

    public Festival festival() {
        return festival;
    }

    public Venue venue() {
        return venue;
    }

    /** Flat program list derived from the schedule (one card per slot). */
    public List<ProgramCard> programs() {
        List<ProgramCard> list = new ArrayList<>();
        for (ScheduleZone z : schedule) {
            for (ScheduleZone.Slot s : z.slots()) {
                list.add(new ProgramCard(z.floor(), z.zone(), z.category(), s.time(),
                        s.content(), s.day(), s.description()));
            }
        }
        return list;
    }

    /** Detailed schedule, one entry per floor/zone. */
    public List<ScheduleZone> schedule() {
        return schedule;
    }
}
