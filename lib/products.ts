import { destHost, destUrl } from "./activation";
import { PRODUCT_ACCENT } from "./hub-tokens";
import type { ProductInfo } from "@/components/ProductCard";

/** The three Hub products — shared by the home-page picker grid and the
 *  per-product /details page so the catalog only lives in one place. */
export const PRODUCTS: ProductInfo[] = [
  {
    type: "ORGANIZER",
    name: "Organizer Manager",
    category: "Events · race-day",
    description: "Create and manage events end-to-end — tickets, participants, race-day cockpit, finance.",
    accent: PRODUCT_ACCENT.ORGANIZER,
    host: destHost("ORGANIZER"),
    url: destUrl("ORGANIZER"),
    capabilities: [
      "Event setup — tickets, waves, forms, and race-day cockpit",
      "Participant management, bibs, check-in, and results",
      "Finance — settlements, payouts, and refunds",
      "Marketing — coupons, email/SMS campaigns, sponsors",
    ],
  },
  {
    type: "BRAND",
    name: "Brand Manager",
    category: "Brand · sponsorship",
    description: "Brand profile, campaigns, audiences, sponsorship deals, and reward pool.",
    accent: PRODUCT_ACCENT.BRAND,
    host: destHost("BRAND"),
    url: destUrl("BRAND"),
    capabilities: [
      "Brand profile, storefront, and public presence",
      "Sponsorship deals and campaign proposals",
      "Audience insights and targeting",
      "Reward pool and redemption tracking",
    ],
  },
  {
    type: "CLUB",
    name: "Club Manager",
    category: "Clubs · communities",
    description: "Members, runs, announcements, channels, awards, and moderation.",
    accent: PRODUCT_ACCENT.CLUB,
    host: destHost("CLUB"),
    url: destUrl("CLUB"),
    capabilities: [
      "Member management, roles, and approvals",
      "Runs, meetups, and attendance tracking",
      "Announcements and channels",
      "Awards, leaderboards, and moderation",
    ],
  },
];

export function productForSlug(slug: string): ProductInfo | undefined {
  return PRODUCTS.find((p) => p.type.toLowerCase() === slug.toLowerCase());
}
