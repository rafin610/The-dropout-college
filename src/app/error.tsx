"use client";

export default function ErrorState({ reset }: { reset: () => void }) {
  return <main className="page-wrap"><div className="page-title"><div className="eyebrow">Something went sideways</div><h1>This page<br /><span style={{ color: "var(--coral)" }}>did not load.</span></h1><p>We could not load this part of the community. Try again and we will get you back to learning.</p><button className="button button-primary" onClick={reset}>Try again</button></div></main>;
}