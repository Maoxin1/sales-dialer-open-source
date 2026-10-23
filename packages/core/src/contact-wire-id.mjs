import {createHash} from 'node:crypto';
/** Stable opaque native IDs; original IDs remain in the business ledger. */
export const contactWireId=(kind,value)=>kind+'-'+createHash('sha256').update(value).digest('hex').toUpperCase();
