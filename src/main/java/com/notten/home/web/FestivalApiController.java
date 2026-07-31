package com.notten.home.web;

import com.notten.home.festival.Edition;
import com.notten.home.festival.Festival;
import com.notten.home.festival.FestivalService;
import com.notten.home.festival.Program;
import com.notten.home.festival.ScheduleZone;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** JSON view of the festival info, for other notten services to consume. */
@RestController
@RequestMapping("/api/festival")
public class FestivalApiController {

    private final FestivalService festivalService;

    public FestivalApiController(FestivalService festivalService) {
        this.festivalService = festivalService;
    }

    @GetMapping
    public FestivalInfo info() {
        return new FestivalInfo(
                festivalService.festival(),
                festivalService.highlights(),
                festivalService.schedule(),
                festivalService.archives());
    }

    public record FestivalInfo(
            Festival festival,
            List<Program> highlights,
            List<ScheduleZone> schedule,
            List<Edition> archives) {
    }
}
