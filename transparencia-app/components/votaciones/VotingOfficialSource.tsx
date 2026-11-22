import type {ReactNode} from 'react';
import SourceLink from '@/components/data/SourceLink';
import {safeOfficialUrl} from '@/lib/voting-presentation';
/** Original documents appear only inside the explicitly requested source context. */
export default function VotingOfficialSource({href,children}:{href:string;children:ReactNode}){const url=safeOfficialUrl(href);return url?<a href={url} target="_blank" rel="noopener noreferrer">{children}</a>:<SourceLink href={href}>{children}</SourceLink>;}
