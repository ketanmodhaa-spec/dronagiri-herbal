/**
 * @dronagiri/validators — Zod schemas shared by the web and mobile apps.
 *
 * Each schema is the single source of truth for both runtime validation and
 * its TypeScript type (exported alongside it via `z.infer`). A rule defined
 * here — the shape of an Indian phone number, the absence of any
 * client-supplied price — holds identically everywhere it is imported.
 *
 * The package depends only on Zod, so it is safe to import from the React
 * Native bundle as well as the Next.js app.
 */
export * from './primitives';
export * from './cart';
export * from './checkout';
export * from './admin';
export * from './product';
export * from './category';
export * from './order';
export * from './coupon';
