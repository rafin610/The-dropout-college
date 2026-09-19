// "The Learning Network" — hero visual for The DropOut College.
// People (initial nodes) with different interests, connected by the desire
// to learn. Editorial and calm: thin lines, mono labels, gentle drift.
// Hover/focus a node to see who is learning what. No radar, no fake stats.

type Person = {
  initials: string;
  name: string;
  learning: string;
  x: number;
  y: number;
  drift: "ln-drift-a" | "ln-drift-b" | "ln-drift-c";
};

const INTERESTS = [
  { label: "AI", x: 200, y: 36, hub: false },
  { label: "CODE", x: 64, y: 128, hub: false },
  { label: "DESIGN", x: 336, y: 128, hub: false },
  { label: "CONTENT", x: 84, y: 252, hub: false },
  { label: "SCIENCE", x: 316, y: 252, hub: false },
  { label: "LEARNING", x: 200, y: 178, hub: true },
];

const INTEREST_LINKS: Array<[number, number]> = [
  [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [1, 5], [2, 5],
];

const PEOPLE: Person[] = [
  { initials: "AR", name: "Ayesha", learning: "AI", x: 138, y: 88, drift: "ln-drift-a" },
  { initials: "NK", name: "Nabil", learning: "Design", x: 262, y: 88, drift: "ln-drift-b" },
  { initials: "SD", name: "Sara", learning: "Code", x: 44, y: 192, drift: "ln-drift-c" },
  { initials: "LH", name: "Leon", learning: "Science", x: 356, y: 192, drift: "ln-drift-a" },
  { initials: "TA", name: "Tania", learning: "Content", x: 138, y: 262, drift: "ln-drift-b" },
  { initials: "RI", name: "Rafi", learning: "AI", x: 262, y: 262, drift: "ln-drift-c" },
];

const PERSON_LINKS: Array<[number, number]> = [
  [0, 0], [0, 1], [1, 0], [1, 2], [2, 1], [2, 3], [3, 2], [3, 4], [4, 3], [4, 5], [5, 4], [5, 5],
];

export function LearningNetwork() {
  return (
    <div className="network-panel">
      <svg
        viewBox="0 0 400 348"
        role="img"
        aria-label="The Learning Network: members with different interests — code, design, AI, content, science — connected through learning"
      >
        {/* interest-to-interest threads */}
        {INTEREST_LINKS.map(([a, b], i) => (
          <line
            key={`i-${i}`}
            className="ln-link"
            x1={INTERESTS[a].x}
            y1={INTERESTS[a].y + 8}
            x2={INTERESTS[b].x}
            y2={INTERESTS[b].y - 6}
          />
        ))}

        {/* person-to-interest threads */}
        {PERSON_LINKS.map(([p, t], i) => (
          <line
            key={`p-${i}`}
            className="ln-link"
            x1={PEOPLE[p].x}
            y1={PEOPLE[p].y}
            x2={INTERESTS[t].x}
            y2={INTERESTS[t].y}
          />
        ))}

        {/* a quiet pulse travelling from CODE through LEARNING to SCIENCE */}
        <path
          className="ln-link-flow"
          d="M64 128 Q130 148 200 170 T316 246"
          fill="none"
          aria-hidden="true"
        />

        {/* interest labels */}
        {INTERESTS.map((interest) => (
          <text
            key={interest.label}
            x={interest.x}
            y={interest.y}
            textAnchor="middle"
            style={{
              fill: interest.hub ? "var(--accent)" : "var(--muted)",
              font: `${interest.hub ? "500 10px" : "500 9px"} 'DM Mono', monospace`,
              letterSpacing: ".14em",
            }}
          >
            {interest.label}
          </text>
        ))}

        {/* people */}
        {PEOPLE.map((person) => (
          <g key={person.initials} className={`ln-node ${person.drift}`} tabIndex={0}>
            <title>{`${person.name} — learning ${person.learning}`}</title>
            <circle cx={person.x} cy={person.y} r={14} />
            <text x={person.x} y={person.y + 3} textAnchor="middle">
              {person.initials}
            </text>
          </g>
        ))}

        {/* an open seat */}
        <g className="ln-node ln-drift-b" tabIndex={0}>
          <title>You — bring something you want to learn</title>
          <circle cx={200} cy={306} r={14} strokeDasharray="3 3" />
          <text x={200} y={309} textAnchor="middle">
            +
          </text>
        </g>
        <text
          x={200}
          y={330}
          textAnchor="middle"
          style={{ fill: "var(--muted)", font: "500 9px 'DM Mono', monospace", letterSpacing: ".14em" }}
        >
          YOU
        </text>
      </svg>
      <p className="network-caption">
        People with different interests, connected by the desire to learn.
      </p>
    </div>
  );
}
