import Link from "next/link";
import s from "./landing.module.css";
import { Logo } from "./Parts";

/** Logo, a line about V-Menu, and links that all go somewhere real. */
export function LandingFooter({ onOpenTour }: { onOpenTour: () => void }) {
    return (
        <footer className={s.footer}>
            <div className={`${s.container} ${s.footGrid}`}>
                <div className={s.footAbout}>
                    <Logo />
                </div>
                <nav className={s.footCol} aria-labelledby="foot-product">
                    <h2 id="foot-product">Product</h2>
                    <ul>
                        <li>
                            <a href="#how" className={s.footLink}>
                                How it works
                            </a>
                        </li>
                        <li>
                            <a href="#features" className={s.footLink}>
                                Features
                            </a>
                        </li>
                        <li>
                            <a href="#faq" className={s.footLink}>
                                FAQ
                            </a>
                        </li>
                        <li>
                            <button type="button" className={s.footLink} onClick={onOpenTour}>
                                Take the tour
                            </button>
                        </li>
                    </ul>
                </nav>
                <nav className={s.footCol} aria-labelledby="foot-start">
                    <h2 id="foot-start">Get started</h2>
                    <ul>
                        <li>
                            <Link href="/signup" className={s.footLink}>
                                Create a restaurant
                            </Link>
                        </li>
                        <li>
                            <Link href="/login" className={s.footLink}>
                                Staff log in
                            </Link>
                        </li>
                        <li>
                            <Link href="/owner/login" className={s.footLink}>
                                Owner log in
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>
            <div className={`${s.container} ${s.footBottom}`}>
                <span>© {new Date().getFullYear()} V-Menu. All rights reserved.</span>
                <span>Made for restaurants, cafés and everyone who feeds people.</span>
            </div>
        </footer>
    );
}
