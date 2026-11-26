"use client";

import { AboutSection } from "./AboutSection";
import { CallToAction } from "./CallToAction";
import { FeaturesSection } from "./FeaturesSection";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { LandingFooter } from "./LandingFooter";
import { LandingNav } from "./LandingNav";

// The original marketing landing page, shown behind (and after) the technical tour.
export function Landing({ onOpenTour }: { onOpenTour: () => void }) {
    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans transition-colors duration-300">
            <LandingNav onOpenTour={onOpenTour} />
            <HeroSection />
            <AboutSection />
            <FeaturesSection />
            <HowItWorksSection />
            <CallToAction />
            <LandingFooter />
        </main>
    );
}
