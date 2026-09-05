import { Link, Navigate } from "react-router";
import { getSessionUser } from "../lib/session";
import heroWebp from "../assets/hero-elder-care.webp";
import heroJpg from "../assets/hero-elder-care.jpg";
import { buttonStyles } from "../components/shared/Button";

const FEATURES = [
  {
    title: "Timeline",
    accent: "sage" as const,
    description:
      "Every dose, meal, and appointment logged as it happens. No more piecing it together from memory three days later.",
    icon: (
      <path
        d="M12 7v5l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    title: "Handoffs",
    accent: "terracotta" as const,
    description:
      "A short note built for the next person on shift: what happened, what's next. Not a group chat someone has to scroll through.",
    icon: (
      <path
        d="M8 7h8m-8 5h5m-5 5h8M4 4h16v16H4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    title: "Preferences",
    accent: "gold" as const,
    description:
      "Prayer times, diet, who's allowed to help with what. Set once by the person they belong to, not guessed at by whoever's on shift.",
    icon: (
      <path
        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    title: "The circle",
    accent: "sage" as const,
    description:
      "Family, a home aide, a neighbor who helps out Fridays. Everyone in one place, seeing the same information.",
    icon: (
      <path
        d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c0-3 2.7-5 6-5s6 2 6 5M9 20c0-2.5 2.2-4.2 5-4.6 2.8.4 5 2.1 5 4.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
];

const STEPS = [
  {
    number: "01",
    title: "Set up the circle",
    description: "Add your parent's name and preferences once. You get an invite code for the people helping out.",
  },
  {
    number: "02",
    title: "Bring people in",
    description: "Send the code to family, an aide, whoever's part of the routine. They join in under a minute.",
  },
  {
    number: "03",
    title: "Log as you go",
    description: "A two-minute entry after a visit or shift. The next person sees it before they even ask.",
  },
];

const ACCENT_CLASSES = {
  sage: "bg-sage-100 text-sage-700 group-hover:bg-sage-500 group-hover:text-white",
  terracotta: "bg-terracotta-100 text-terracotta-700 group-hover:bg-terracotta-500 group-hover:text-white",
  gold: "bg-gold-100 text-gold-700 group-hover:bg-gold-500 group-hover:text-white",
};

export default function Home() {
  if (getSessionUser()) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-sand-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
            <circle cx="41.53" cy="37.5" r="20" fill="#4A7C6B" opacity="0.9" />
            <circle cx="22.47" cy="37.5" r="20" fill="#C9784F" opacity="0.85" />
            <circle cx="32" cy="21" r="20" fill="#D4A94A" opacity="0.95" />
          </svg>
          <span className="text-lg font-extrabold text-ink-900">Care Circle</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="px-3 py-2 text-sm font-semibold text-ink-900 hover:text-sage-700">
            Log in
          </Link>
          <Link to="/signup" className={buttonStyles("primary", "default")}>
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-10 md:grid-cols-2 md:py-20">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
            One circle, <span className="text-sage-700">everyone in sync.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink-700">
            Care Circle replaces the scattered WhatsApp thread with one shared space for the
            people caring for an elderly family member: timelines, handoffs, and preferences your
            parent controls, not a one-size-fits-all setting.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className={buttonStyles("primary", "lg")}>
              Get started
            </Link>
            <Link to="/login" className={buttonStyles("secondary", "lg")}>
              Log in
            </Link>
          </div>
        </div>

        <div className="relative">
          <picture>
            <source srcSet={heroWebp} type="image/webp" />
            <img
              src={heroJpg}
              alt="An elderly woman smiling and holding hands with her adult daughter outdoors"
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lg transition-transform duration-300 hover:scale-[1.02]"
              width={2000}
              height={1333}
              loading="eager"
            />
          </picture>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-sage-700">What it actually does</p>
          <h2 className="mt-2 text-3xl font-extrabold text-ink-900">Four things, done properly</h2>
          <p className="mt-3 text-ink-700">
            Most families end up managing this in a group chat and a shared notes app that nobody
            fully trusts. Care Circle is the four pieces that chat was standing in for, put
            somewhere they actually work.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-200 ${ACCENT_CLASSES[feature.accent]}`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  {feature.icon}
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-ink-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-sage-700">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold text-ink-900">Up and running in three steps</h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="group">
                <span className="text-4xl font-extrabold text-sand-300 transition-colors duration-200 group-hover:text-terracotta-500">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-bold text-ink-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sage-500">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Start the circle for someone you care for.</h2>
            <p className="mt-2 max-w-md text-sage-100">
              Free to set up. Takes less time than the group chat you're replacing.
            </p>
          </div>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-sage-700 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="bg-ink-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden="true">
              <circle cx="41.53" cy="37.5" r="20" fill="#fff" opacity="1" />
              <circle cx="22.47" cy="37.5" r="20" fill="#fff" opacity="0.75" />
              <circle cx="32" cy="21" r="20" fill="#fff" opacity="0.55" />
            </svg>
            <span className="text-sm font-extrabold text-white">Care Circle</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-sand-300">
            <Link to="/login" className="transition-colors hover:text-white">
              Log in
            </Link>
            <Link to="/signup" className="transition-colors hover:text-white">
              Sign up
            </Link>
          </nav>

          <p className="text-xs text-sand-400">&copy; 2026 Care Circle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
