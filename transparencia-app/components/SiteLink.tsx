import type { AnchorHTMLAttributes } from "react";

type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
};

/**
 * Pages serves HTML and browser assets only. A Next Link click starts an RSC
 * navigation, but static export does not publish the RSC endpoint; the browser
 * then shows "This page couldn't load" instead of the next static document.
 * Use a real anchor so every internal navigation requests the published HTML.
 * This is intentionally a full document navigation: it is reliable on Pages,
 * OpenNext and preview servers, and it does not depend on an API or RSC route.
 */
export default function SiteLink(props: SiteLinkProps) {
  return <a {...props} />;
}
