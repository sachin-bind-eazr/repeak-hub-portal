"use client";

/**
 * Ported from web-partner-portal's `components/partner-hub/HubHeroBanner.tsx`
 * — same dark-to-teal gradient hero + glassy tool tiles the OM/BM/CM
 * `/hub` home page opens with. Simplified for a login/product-picker
 * screen: no "active workspace" dashboard headline, always shows all
 * three products as tiles (this app's whole job is picking one),
 * and the primary CTA just scrolls to the picker grid below.
 */

import { FONT } from "@/lib/hub-tokens";
import { iconForWorkspaceType } from "./hub-icons";
import type { ProductInfo } from "./ProductCard";

export function HubHero({
  firstName,
  products,
}: {
  firstName: string | null;
  products: ProductInfo[];
}) {
  return (
    <section
      data-testid="hub-hero-banner"
      style={{
        position: "relative",
        borderRadius: 22,
        overflow: "hidden",
        background: "linear-gradient(125deg, #0B0F10 0%, #0E2C30 32%, #006F7A 60%, #00B4A6 100%)",
        color: "#fff",
        isolation: "isolate",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 540,
          height: 540,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 210, 119, 0.58) 0%, rgba(0, 126, 69, 0.22) 35%, transparent 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -160,
          left: -100,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, #9fe87055 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 1280 320"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.28, pointerEvents: "none" }}
      >
        <g stroke="#fff" strokeOpacity="0.35" strokeWidth="1" fill="none">
          <path d="M-20 240 L120 200 L260 218 L380 160 L520 200 L680 130 L820 178 L960 110 L1100 156 L1300 100" />
          <path
            d="M-20 180 L120 140 L260 158 L380 100 L520 140 L680 70 L820 118 L960 50 L1100 96 L1300 40"
            strokeOpacity="0.20"
          />
          <path
            d="M-20 280 L120 240 L260 258 L380 200 L520 240 L680 170 L820 218 L960 150 L1100 196 L1300 140"
            strokeOpacity="0.42"
          />
        </g>
      </svg>

      <div
        className="hub-hero-grid"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
          gap: 28,
          alignItems: "center",
          padding: "36px 36px 32px",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (max-width: 880px) {
            .hub-hero-grid { grid-template-columns: 1fr !important; }
            .hub-hero-tiles { grid-template-columns: 1fr 1fr !important; }
          }
          @media (max-width: 540px) {
            .hub-hero-tiles { grid-template-columns: 1fr !important; }
          }
        `,
          }}
        />

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.10)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.80)",
              fontFamily: FONT.ui,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#9fe870",
                boxShadow: "0 0 8px #9fe870",
              }}
            />
            {firstName ? `Hi, ${firstName}` : "Hi there"}
          </div>
          <h1
            style={{
              margin: "16px 0 10px",
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: "-0.030em",
              color: "#fff",
              fontFamily: FONT.display,
              lineHeight: 1.04,
            }}
          >
            One login for every Repeak product.
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              color: "rgba(255, 255, 255, 0.78)",
              lineHeight: 1.55,
              maxWidth: 480,
              fontFamily: FONT.ui,
            }}
          >
            Organizer, Brand, and Club each run at their own address — pick one below and Repeak signs you
            straight in.
          </p>
        </div>

        <div
          className="hub-hero-tiles"
          style={{ display: "grid", gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))`, gap: 12 }}
        >
          {products.map((p) => (
            <HeroTile key={p.type} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroTile({ product }: { product: ProductInfo }) {
  const Icon = iconForWorkspaceType(product.type);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "16px 16px 18px",
        background: "rgba(255, 255, 255, 0.10)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: 16,
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.10)",
        minHeight: 120,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(255, 255, 255, 0.18)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(255, 255, 255, 0.26)",
        }}
      >
        <Icon size={20} color="#fff" strokeWidth={1.8} />
      </span>
      <div
        style={{
          fontSize: 15.5,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-0.012em",
          fontFamily: FONT.display,
          lineHeight: 1.18,
        }}
      >
        {product.name}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.72)", fontFamily: FONT.ui, lineHeight: 1.5 }}>
        {product.category}
      </div>
    </div>
  );
}
