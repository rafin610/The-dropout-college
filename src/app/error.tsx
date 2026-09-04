"use client";

export default function ErrorState({ reset }: { reset: () => void }) {
  return <main className="page-wrap"><div className="page-title"><div className="eyebrow">Something went sideways</div><h1>The signal<br /><span style={{ color: "var(--coral)" }}>dropped.</span></h1><p>We could not load this part of the network. Try again, and we will reconnect you.</p><button className="button button-primary" onClick={reset}>Try again</button></div></main>;
}