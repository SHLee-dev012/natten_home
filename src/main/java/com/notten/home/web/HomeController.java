package com.notten.home.web;

import com.notten.home.festival.FestivalService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/** Renders the festival home (landing) page. */
@Controller
public class HomeController {

    private final FestivalService festivalService;

    public HomeController(FestivalService festivalService) {
        this.festivalService = festivalService;
    }

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("festival", festivalService.festival());
        model.addAttribute("highlights", festivalService.highlights());
        return "index";
    }
}
