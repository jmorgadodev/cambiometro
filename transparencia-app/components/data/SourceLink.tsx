import type { ComponentProps } from "react";
import { sourceAccessDestination } from "@/lib/source-access";
/** Mantiene la evidencia; el acceso al portal se concentra en Fuentes y alcances. */
export default function SourceLink({ href, children, ...props }: ComponentProps<"a">) {
    const destination = sourceAccessDestination(href);
    const routed = destination !== href;
    return <a {...props} href={destination} download={routed ? undefined : props.download} aria-label={routed ? "Fuentes y alcance" : props["aria-label"]} target={routed ? undefined : props.target} rel={routed ? undefined : props.rel}>{routed ? "Fuentes y alcance" : children}</a>;
}
