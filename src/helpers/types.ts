import type { Predicate } from 'vahvista'

// TODO: Use only till vahvista #163 is closed
export type PredicateType<P> = P extends Predicate<infer T> ? T : never
