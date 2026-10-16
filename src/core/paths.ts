// The site can be served from a subpath (e.g. GitHub Pages project sites); BASE always ends in "/".
const BASE = import.meta.env.BASE_URL;

/** Prefix a root-relative app path ("/media/x.mp4") with the deploy base. */
export const url = (path: string) => (/^[a-z]+:|^#/.test(path) ? path : BASE + path.replace(/^\//, ""));

/** App-relative pathname ("/interviews/x") for a full browser pathname. */
export const route = (pathname: string) =>
  pathname.startsWith(BASE) ? "/" + pathname.slice(BASE.length) : pathname;
