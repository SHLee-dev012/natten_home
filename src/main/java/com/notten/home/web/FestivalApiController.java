package com.notten.home.web;

import com.notten.home.festival.Festival;
import com.notten.home.festival.FestivalService;
import com.notten.home.festival.Program;
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
        return new FestivalInfo(festivalService.festival(), festivalService.highlights());
    }

    public record FestivalInfo(Festival festival, List<Program> highlights) {
    }
}
