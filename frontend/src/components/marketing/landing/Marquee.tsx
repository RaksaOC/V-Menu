import s from "./landing.module.css";

const PLACES = [
    "Noodle bars",
    "Cafés",
    "Hotpot houses",
    "Rooftop bars",
    "Bakeries",
    "Food courts",
    "Family restaurants",
    "Hotel dining",
    "Night markets",
    "Coffee shops",
];

/** A slow ribbon of the kinds of places V-Menu suits. The list is drawn twice so it loops. */
export function Marquee() {
    return (
        <section className={s.marquee} aria-label="Made for every kind of dining room">
            <div className={s.track} aria-hidden="true">
                {[...PLACES, ...PLACES].map((p, i) => (
                    <span key={i}>{p}</span>
                ))}
            </div>
        </section>
    );
}
