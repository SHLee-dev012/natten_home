package com.notten.home.festival;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Provides the festival details and programs, served as JSON by the festival API. */
@Service
public class FestivalService {

    private final Festival festival = new Festival(
            "낯선대학 10주년 축제",
            "과거를 기록하고, 현재를 연결하고, 미래를 확장하는 축제",
            "STRANGER UNIV. 10TH ANNIVERSARY",
            LocalDate.of(2026, 9, 12),
            LocalDate.of(2026, 9, 13));

    private final Venue venue = new Venue(
            "사유의 서재",
            List.of("4층", "5층", "테라스"),
            "https://naver.me/xQe26Aqr");

    // Detailed schedule by floor/zone. Slot hours are 24h; day: 0 = both, 1/2 = that day only.
    private final List<ScheduleZone> schedule = List.of(
            new ScheduleZone("1F", "교무처", "리셉션", "현장 운영", List.of(
                    new ScheduleZone.Slot(11, 21, "환대 & 오리엔테이션", 0,
                            "행사장 입구에서 참가자를 맞이하고, 축제 안내와 동선·프로그램을 소개합니다."))),
            new ScheduleZone("4F", "캠퍼스 낭만존", "공연", "심재욱, 김누림", List.of(
                    new ScheduleZone.Slot(11, 17, "보이는 라디오 (DJ부스)", 0,
                            "DJ 부스에서 진행되는 라이브 라디오. 사연과 신청곡으로 캠퍼스 낭만존을 채웁니다."),
                    new ScheduleZone.Slot(11, 17, "애장품 경매", 2,
                            "참가자들이 내놓은 애장품을 즉석 경매로 나누는 2일차 한정 프로그램입니다."),
                    new ScheduleZone.Slot(18, 21, "임팩트 있는 공연 (1~2팀)", 0,
                            "저녁 시간, 캠퍼스 낭만존 무대를 달굴 1~2팀의 임팩트 있는 라이브 공연."))),
            new ScheduleZone("4F", "캠퍼스 낭만존", "마켓", "강다혜, 한정은, 문지현 · 운영총괄(부스협찬)", List.of(
                    new ScheduleZone.Slot(11, 14, "플리마켓(중고) · 비즈마켓(사업+홍보) · 간단 디저트", 0,
                            "중고 물품 플리마켓과 사업·홍보 비즈마켓, 간단한 디저트가 함께하는 낮 시간 마켓."),
                    new ScheduleZone.Slot(14, 21, "협찬부스(술+먹거리) · 셀러 모집", 0,
                            "협찬 부스에서 술과 먹거리를 즐기고, 함께할 셀러도 현장에서 모집합니다."))),
            new ScheduleZone("5F", "라이브러리 배움터", "사람책 · 취업박람회", "강다혜, 심재욱, 온은주", List.of(
                    new ScheduleZone.Slot(11, 14, "강연 30 + QnA 20 (6층 이동 후 1:1)", 0,
                            "30분 강연과 20분 Q&A로 진행되며, 이후 6층으로 이동해 1:1 대화를 이어갑니다."),
                    new ScheduleZone.Slot(14, 21, "낯대 추천인 사람책 발표 (흥미로운 주제)", 1,
                            "낯선대학이 추천한 연사들이 흥미로운 주제로 자신의 이야기를 풀어내는 1일차 사람책."),
                    new ScheduleZone.Slot(14, 21, "사람책 발표 (소속·직업 등, 외부 인용)", 2,
                            "다양한 소속·직업의 외부 연사를 초청해 진행하는 2일차 사람책 발표."))),
            new ScheduleZone("6F", "네트워킹 존", "DJ", "심재욱, 김누림", List.of(
                    new ScheduleZone.Slot(11, 21, "6층 바이브 · 다양한 DJ 라인업", 0,
                            "6층 네트워킹 존의 분위기를 책임지는 다양한 DJ 라인업이 하루 종일 이어집니다."))),
            new ScheduleZone("6F", "네트워킹 존", "F&B", "강다혜, 한정은, 문지현 · 운영총괄(부스협찬)", List.of(
                    new ScheduleZone.Slot(11, 21, "협찬부스 (술+먹거리)", 0,
                            "네트워킹 존에서 술과 먹거리를 즐기며 자유롭게 교류하는 협찬 부스."))),
            new ScheduleZone("4F~6F · 외부", "전시존", "전시", "김민수, 최근우", List.of(
                    new ScheduleZone.Slot(11, 21, "포토존 · 낯선대학 WALL · 가계도 · 사진전 · 원티드 게시판 · 공모전", 0,
                            "포토존과 낯선대학 WALL, 가계도, 사진전, 원티드 게시판, 공모전 출품작을 상시 전시합니다."))));

    public Festival festival() {
        return festival;
    }

    public Venue venue() {
        return venue;
    }

    /** Flat program list derived from the schedule (one card per time slot). */
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
