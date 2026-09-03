package com.notten.home.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Renders the festival home (landing) page.
 *
 * <p>The page content lives in the template itself, so no model attributes are
 * needed here. The festival data in {@code FestivalService} is served as JSON by
 * {@link FestivalApiController} instead.
 */
@Controller
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "index";
    }

    /**
     * Renders the admin gate page.
     *
     * <p>The page ships no data of its own. The roster lives beside it as an
     * encrypted blob ({@code /admin/roster.enc.json}) that only the browser can
     * open, and only with the passphrase. Nothing here reads or holds it.
     */
    @GetMapping("/admin")
    public String admin() {
        return "admin";
    }
}
