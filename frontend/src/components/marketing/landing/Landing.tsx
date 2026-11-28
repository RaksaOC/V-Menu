"use client";

import { MotionConfig } from "framer-motion";
import { Bento } from "./Bento";
import { CallToAction } from "./CallToAction";
import { Faq } from "./Faq";
import { Hero } from "./Hero";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";
import s from "./landing.module.css";
import { Marquee } from "./Marquee";
import { Stats } from "./Stats";
import { StorySection } from "./StorySection";
import { TeamSection } from "./TeamSection";

// The marketing landing page. Motion is turned down for anyone who asks their device for less.
export function Landing({ onOpenTour }: { onOpenTour: () => void }) {
    return (
        <MotionConfig reducedMotion="user">
            <div className={s.page}>
                <LandingNav onOpenTour={onOpenTour} />
                <main>
                    <Hero onOpenTour={onOpenTour} />
                    <Marquee />
                    <StorySection />
                    <Stats />
                    <Bento />
                    <TeamSection />
                    <Faq />
                    <CallToAction />
                </main>
                <LandingFooter onOpenTour={onOpenTour} />
            </div>
        </MotionConfig>
    );
}
