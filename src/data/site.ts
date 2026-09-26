// All reader-facing copy lives here. Canon rules: sentence case, plain words,
// no numbers or metrics, no "it's not X, it's Y". Proof is a link you can open.

export const site = {
  url: 'https://www.alvarozamorano.com',
  name: 'Álvaro Zamorano',
  role: 'AI Systems Architect',
  city: 'Madrid',
  title: 'Álvaro Zamorano, AI Systems Architect',
  description:
    'I design AI systems that run on their own, and the checks that prove they work. Based in Madrid.',
  linkedin: 'https://www.linkedin.com/in/azmglg/',
  github: 'https://github.com/alvaro-zamorano',
  studio: 'https://www.studioazm.com',
  source: 'https://github.com/alvaro-zamorano/alvarozamorano.com',
};

export const nav = [
  { label: 'Work', href: '#work' },
  { label: 'How I build', href: '#method' },
  { label: 'Studio', href: '#studio' },
  { label: 'Writing', href: '#writing' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export const hero = {
  eyebrow: 'AI Systems Architect, Madrid',
  title: ['Autonomy', 'by design.'],
  lead: 'I design AI systems that run on their own, and the checks that prove they work.',
  links: [
    { label: 'Selected work', href: '#work', icon: 'down' },
    { label: 'StudioAZM, films', href: '#studio', icon: 'down' },
    { label: 'Source of this site', href: site.source, icon: 'out' },
  ],
  kit: {
    alt: 'Kit, a fox made of blocks. Break him and he rebuilds himself, then checks his own work.',
    hintPointer: 'Drag to break Kit',
    hintTouch: 'Tap Kit to break him',
    button: 'Break Kit',
  },
};

export type Project = {
  name: string;
  kicker: string;
  text: string;
  links: { label: string; href: string; lang?: 'ES' }[];
};

export type Also = { name: string; text: string; href: string; lang?: 'ES' };

export const work: { title: string; intro: string; items: Project[]; alsoTitle: string; also: Also[] } = {
  title: 'Selected work',
  intro: 'Things I built that you can open and check for yourself.',
  items: [
    {
      name: 'AgentOS',
      kicker: 'Agents that finish',
      text:
        "An agent runtime that finishes what it starts. Each mission carries a definition of done written as code, and a separate verifier decides when it's met. A human only steps in for payments or anything that can't be undone.",
      links: [
        { label: 'Source', href: 'https://github.com/alvaro-zamorano/agentos' },
        {
          label: 'Essay',
          href: 'https://github.com/alvaro-zamorano/agentos/blob/main/docs/machine-verifiable-dod.md',
        },
      ],
    },
    {
      name: 'LiveKnowledge',
      kicker: 'Reports you can question',
      text:
        'Turns a long consulting report into something clients can question. Every answer points to the exact page it came from.',
      links: [{ label: 'Live demo', href: 'https://liveknowledge.vercel.app', lang: 'ES' }],
    },
    {
      name: 'HABLA',
      kicker: 'Websites for AI agents',
      text:
        'An audit that tells you whether AI agents can find, read and cite a website. Each check runs as a single command, so anyone can repeat it.',
      links: [
        { label: 'Try it', href: 'https://machineready.vercel.app', lang: 'ES' },
        { label: 'Source', href: 'https://github.com/alvaro-zamorano/Machineready' },
      ],
    },
    {
      name: 'esGEO',
      kicker: 'Getting cited by AI',
      text:
        'A method for writing content that AI models quote, turned into tools and a course for Spanish-speaking teams.',
      links: [
        { label: 'Visit', href: 'https://www.esgeo.ai', lang: 'ES' },
        { label: 'Source', href: 'https://github.com/alvaro-zamorano/geo-citation-craft' },
      ],
    },
    {
      name: 'This site',
      kicker: 'Built from blocks',
      text:
        'Kit is rebuilt from blocks in your browser, live. Every release has to pass the same checks for layout, speed and accessibility before it ships.',
      links: [{ label: 'Source', href: site.source }],
    },
  ],
  alsoTitle: 'Also',
  also: [
    {
      name: 'PS2WEB',
      text: 'a PlayStation 2 emulator in the browser, bring your own games',
      href: 'https://dist-ivory-phi-37.vercel.app',
    },
    {
      name: 'Plano 3D',
      text: "an architect's floor plan turned into checked measurements and a 3D view",
      href: 'https://github.com/alvaro-zamorano/studioarquitectura',
    },
  ],
};

export const method = {
  title: 'How I build',
  lead: "Starting an agent is easy. Knowing when it's done is the hard part, so that's where I start.",
  steps: [
    {
      name: 'Define done',
      text: 'Before anything runs, I write down what finished looks like, in a form a machine can check.',
    },
    {
      name: 'Let the agents work',
      text: 'A team of AI agents does the work with its own tools and memory, without waiting on me.',
    },
    {
      name: 'Check every result',
      text: 'A separate step checks each result against that definition. Anything that fails goes back and gets redone.',
    },
    {
      name: 'Call a human when it matters',
      text: "People step in for payments and for anything that can't be undone. Nowhere else.",
    },
  ],
  payoff: ['Verification', 'over vibes.'],
  note: "If a machine can't check that something is done, it isn't specified yet.",
  // the scroll story: the last block waits for a person
  approve: 'Approve',
  approveLabel: 'Approve the last block',
};

export type LogEntry = {
  scene: string; // a clip in src/data/media.ts (logMedia)
  from: string;
  to: string;
  link?: { title: string; meta: string; href: string; lang?: 'ES' };
};

// Writing, told as Kit's log: each scene is one thing building agents taught
// me ("from" gets struck out, "to" earns its green), and links to where I wrote
// it up when there is a piece. The stage plays them in this order.
export const writing: { eyebrow: string; title: string; lead: string; entries: LogEntry[] } = {
  eyebrow: 'Writing',
  title: "Kit's log",
  lead: 'What building agents taught me, one scene at a time, and where I wrote it up.',
  entries: [
    { scene: 'grandline', from: 'a map', to: 'a compass' },
    { scene: 'rooftop', from: 'one prompt', to: 'a whole system' },
    {
      scene: 'builder',
      from: 'writing code',
      to: 'defining done',
      link: {
        title: 'A machine-verifiable definition of done',
        meta: 'Essay, on GitHub',
        href: 'https://github.com/alvaro-zamorano/agentos/blob/main/docs/machine-verifiable-dod.md',
      },
    },
    {
      scene: 'kraken',
      from: 'judging the demo',
      to: 'checking the wiring',
      link: {
        title: 'Most agents are demos in a costume',
        meta: 'Video, on LinkedIn',
        href: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7480154055735074816/',
      },
    },
    { scene: 'traces', from: 'dashboards', to: 'sitting with traces' },
    {
      scene: 'handoffs',
      from: 'more agents',
      to: 'clear handoffs',
      link: {
        title: 'The moat keeps moving',
        meta: 'Video, on LinkedIn',
        href: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7478334475769245696/',
      },
    },
    {
      scene: 'hammock',
      from: 'watching every step',
      to: 'trusting the checks',
      link: { title: 'How I build', meta: 'On this page', href: '#method' },
    },
    {
      scene: 'machines',
      from: 'written for people',
      to: 'read by machines',
      link: {
        title: 'Your next reader is a machine',
        meta: 'Carousel, on LinkedIn',
        href: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7470007234769477633/',
        lang: 'ES',
      },
    },
  ],
};

export type StudioPiece = {
  brand: string;
  name: string;
  kind: string;
  href?: string;
  lang?: 'ES';
  video?: boolean; // a short silent loop instead of a still (media in src/data/media.ts)
};

export const studio = {
  title: ['Impossible scenes.', 'No shoot.'],
  eyebrow: 'StudioAZM, my film studio',
  lead: 'A generative model is a camera without an operator. We bring the script, the optics, the light and the cut, and brands get scenes that would be impossible or too expensive to film.',
  reel: { caption: 'Studio reel', alt: 'A model walks through a set of neon lights that spell AZM.' },
  workTitle: 'Work for brands',
  pieces: [
    { brand: 'Prosegur', name: 'Hybrid Security: people, technology and data as one system', kind: 'Film', video: true },
    { brand: 'Prosegur', name: 'POPS: the film for the 2026 convention', kind: 'Film', video: true },
    {
      brand: 'The Boston Pharmacy',
      name: 'Campaign: three spots, Reels and a consultation that ends in a prescription',
      kind: 'Campaign',
      href: 'https://alvaro-pipeline.pages.dev/boston',
      lang: 'ES',
    },
    { brand: 'Cuchitas', name: 'Tortillas so Mexican they change your accent', kind: 'Spec ad', video: true },
  ] as StudioPiece[],
  links: [
    { label: 'Watch the reel', href: `${site.studio}/#reel`, lang: 'ES' as const },
    { label: 'Commission a scene', href: `${site.studio}/#contacto`, lang: 'ES' as const },
  ],
};

export const about = {
  title: 'About',
  statement: 'I build AI-first. I direct the tools, write the checks, and only trust what passes them.',
  lines: [
    "I'm Álvaro, an AI systems architect based in Madrid.",
    'By day I work on AI for large enterprises. By night I build with it.',
    'Industrial engineer, MSc from Universidad Politécnica de Madrid. Anthropic certifications in Claude: Architect, Developer and Foundations.',
  ],
  kit: "Kit is the fox that builds on its own while you sleep. On this page he's also the one who fixes himself.",
  studio: { label: 'I also direct AI films at StudioAZM', href: site.studio },
};

export const contact = {
  title: "Let's build something that runs on its own.",
  lead: "Tell me what should happen without you, and how we'll know it did.",
  cta: { label: 'Message me on LinkedIn', href: site.linkedin },
  links: [
    { label: 'GitHub', href: site.github },
    { label: 'StudioAZM', href: site.studio },
  ],
  kit: 'Kit is keeping watch.',
};

export const footer = {
  line: 'Built from blocks. Checked before every release.',
};
