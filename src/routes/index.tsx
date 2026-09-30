import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { isSignedIn } from "@/lib/auth-client";
import { landingMarkup } from "@/landing/markup";
import "@/landing/landing.css";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    if (isSignedIn()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "rootX UPTIMER — Uptime Monitoring" },
      {
        name: "description",
        content:
          "rootX UPTIMER keeps watch on your websites and APIs with fast checks, instant alerts and clean status reports.",
      },
      { property: "og:title", content: "rootX UPTIMER — Uptime Monitoring" },
      {
        property: "og:description",
        content: "Monitor uptime, latency and incidents for every site you run.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const root = rootRef.current;
    if (!root) return;

    const menuPanel = root.querySelector<HTMLElement>("#menuPanel");
    const openMenu = () => {
      menuPanel?.classList.add("active");
      document.body.style.overflow = "hidden";
    };
    const closeMenu = () => {
      menuPanel?.classList.remove("active");
      document.body.style.overflow = "";
    };

    w['goLogin'] = () => navigate({ to: "/auth" });
    w['goRegister'] = () => navigate({ to: "/auth", hash: "signup" });
    w['openMenu'] = openMenu;
    w['closeMenu'] = closeMenu;

    const onPanelClick = (e: MouseEvent) => {
      if (e.target === menuPanel) closeMenu();
    };
    menuPanel?.addEventListener("click", onPanelClick);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    root.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    root.querySelectorAll<HTMLElement>(".feature").forEach((card, index) => {
      card.style.transitionDelay = `${index * 80}ms`;
    });

    const header = root.querySelector<HTMLElement>("header");
    const onScroll = () => {
      if (!header) return;
      header.style.boxShadow = window.scrollY > 20 ? "0 10px 35px rgba(0,0,0,.3)" : "none";
    };
    window.addEventListener("scroll", onScroll);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      observer.disconnect();
      menuPanel?.removeEventListener("click", onPanelClick);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      delete w['goLogin'];
      delete w['goRegister'];
      delete w['openMenu'];
      delete w['closeMenu'];
    };
  }, [navigate]);

  return (
    <div
      ref={rootRef}
      className="landing-root"
      dangerouslySetInnerHTML={{ __html: landingMarkup }}
    />
  );
}
