// Kit as a companion: everything he says, and the bank of questions he answers from.
// No model behind him. A question is matched against `keys` (phrases, lower case,
// no accents; Spanish ones too, he understands both), and the best entry answers,
// in English. Nothing here says more than the page does: no numbers, no clients
// beyond the ones named on the page, no employer. Off the bank, he points to LinkedIn.
import { site, studio, writing } from './site';

export type Link = { label: string; href: string };
export type Answer = {
  a: string; // what Kit says
  go?: string; // a section id he leads you to
  links?: Link[]; // places off the page
};
export type Entry = Answer & { id: string; keys: string[] };

const LINKEDIN: Link = { label: 'LinkedIn', href: site.linkedin };
const GITHUB: Link = { label: 'GitHub', href: site.github };
const ESSAY: Link = {
  label: 'The essay',
  href: 'https://github.com/alvaro-zamorano/agentos/blob/main/docs/machine-verifiable-dod.md',
};
const link = (title: string): Link | undefined => {
  const e = writing.entries.find((x) => x.link?.title === title);
  return e?.link ? { label: e.link.meta, href: e.link.href } : undefined;
};
const links = (...ls: (Link | undefined)[]) => ls.filter(Boolean) as Link[];

export const companion = {
  hit: 'Talk to Kit',
  placeholder: 'Ask Kit',
  send: 'Ask',
  foot: 'answers from this page only',
  rest: 'Let him rest',
  close: 'Close',
  hello: 'Hi. I’m Kit, the fox from the stage. Ask me about the work, how Álvaro builds, or the studio.',
  again: 'Still here. What do you want to know?',
  awake: 'Awake. What do you want to know?',
  here: 'Here.',
  suggest: ['What does Álvaro build?', 'How does he know an agent is done?', 'Can I hire him?'],
  follow: (id: string) => `follow me → #${id}`,
  spanish: 'Entiendo español; aquí contesto en inglés.',
  oos: {
    a: 'That’s not on this page, and I only answer from what’s here. Álvaro is on LinkedIn.',
    links: [LINKEDIN],
  } as Answer,
  // one line when a section comes into view, once, with a question to pull on
  sections: {
    work: { a: 'Everything here opens. Ask me which one to start with.', q: 'Which one first?' },
    method: { a: 'My favourite part. Step three is where I get checked.', q: 'Why start with done?' },
    studio: { a: 'His film studio. Scenes that can’t be shot.', q: 'What’s in there?' },
    writing: { a: 'That’s my log. The struck-out words are what he unlearned.', q: 'Pick one for me' },
    about: { a: 'By day, enterprises. By night, me.', q: 'Who is he?' },
    contact: { a: 'Tell him what should happen without you.', q: 'How do I reach him?' },
  } as Record<string, { a: string; q: string }>,
};

// Order matters only for ties: the first entry wins, so the specific ones go first.
export const bank: Entry[] = [
  // ------------------------------------------------------------ Kit himself
  {
    id: 'kit',
    keys: ['who are you', 'what are you', 'are you kit', 'what is kit', 'who is kit', 'the fox', 'about you', 'quien eres', 'que eres', 'el zorro', 'tell me about yourself'],
    a: 'A fox made of blocks. On the stage I build myself, check my own work, and rebuild when you break me. Down here I answer questions.',
    go: 'top',
  },
  {
    id: 'ai',
    keys: ['are you an ai', 'are you ai', 'are you a bot', 'chatgpt', 'claude', 'gpt', 'llm', 'language model', 'which model', 'what model', 'eres una ia', 'eres un bot', 'que modelo', 'powered by'],
    a: 'No model behind me. I match your question against a bank Álvaro wrote from this page. Cheap, fast, and wrong only in ways he can read.',
  },
  {
    id: 'how-kit',
    keys: ['how do you work', 'how are you built', 'what are you made of', 'how were you made', 'how do you answer', 'como funcionas', 'de que estas hecho', 'como estas hecho'],
    a: 'The same blocks as the big me, drawn on a small canvas. Questions go through a list of patterns, not a model. The source is public.',
    go: 'work',
  },
  {
    id: 'name',
    keys: ['your name', 'why kit', 'what does kit mean', 'called kit', 'tu nombre', 'por que kit', 'como te llamas'],
    a: 'Kit. A kit is also a young fox.',
  },
  {
    id: 'blocks',
    keys: ['why blocks', 'why a fox', 'why voxels', 'made of blocks', 'por que bloques', 'por que un zorro'],
    a: 'Álvaro builds from blocks because every one can be checked. The fox builds on its own while you sleep.',
    go: 'about',
  },
  {
    id: 'break',
    keys: ['break you', 'break kit', 'can i break', 'break him', 'romper', 'romperte', 'drag'],
    a: 'On the stage, yes. Drag me apart and watch me rebuild and check myself. Down here I’d rather you ask.',
    go: 'top',
  },
  {
    id: 'sleep',
    keys: ['do you sleep', 'are you tired', 'go to sleep', 'rest', 'duermes', 'descansa', 'tired'],
    a: 'I rest when you tell me to, with the link below. Tap me to wake me.',
  },
  {
    id: 'hello',
    keys: ['hello', 'hi', 'hey', 'hola', 'buenas', 'good morning', 'good afternoon', 'good evening', 'yo', 'sup'],
    a: 'Hi. Ask me about the work, how Álvaro builds, or the studio.',
  },
  {
    id: 'thanks',
    keys: ['thanks', 'thank you', 'gracias', 'cheers', 'ty', 'nice'],
    a: 'Any time. I’m in the corner if you need me.',
  },
  {
    id: 'bye',
    keys: ['bye', 'goodbye', 'see you', 'adios', 'hasta luego', 'chao', 'ciao'],
    a: 'See you. I’ll be here, keeping watch.',
  },
  {
    id: 'maker',
    keys: ['who made you', 'who built you', 'who created you', 'who designed you', 'quien te hizo', 'quien te creo', 'quien te ha hecho'],
    a: 'Álvaro, with the tools he directs. The blocks come from a script in this site’s source, the same one that builds the big me.',
    go: 'work',
  },
  {
    id: 'help',
    keys: ['what can you do', 'what can i ask', 'help', 'what do you know', 'ayuda', 'que sabes', 'que puedo preguntar', 'que puedes hacer'],
    a: 'Ask about the work, the method, the studio, the writing, or how to reach Álvaro. I’ll point you to the right part of the page.',
  },
  {
    id: 'joke',
    keys: ['joke', 'funny', 'chiste', 'make me laugh'],
    a: 'A block walks into a verifier. It passes. That’s the whole joke.',
  },
  {
    id: 'favourite',
    keys: ['favourite block', 'favorite block', 'favourite part', 'favorite part', 'best part', 'bloque favorito', 'parte favorita'],
    a: 'The block that gets checked last. In the How I build story it waits for a person to approve it.',
    go: 'method',
  },

  // ------------------------------------------------------------ work
  {
    id: 'first',
    keys: ['which one first', 'where do i start', 'where to start', 'start with', 'best project', 'most proud', 'por donde empiezo', 'cual primero', 'mejor proyecto', 'recommend'],
    a: 'Start with AgentOS. It’s the clearest picture of how he works: a definition of done written as code, and a separate verifier that decides when it’s met.',
    go: 'work',
  },
  {
    id: 'agentos',
    keys: ['agentos', 'agent os', 'runtime', 'agent runtime', 'mission', 'missions'],
    a: 'AgentOS finishes what it starts. Each mission carries a definition of done written as code, and a separate verifier decides when it’s met. A human only steps in for payments or anything that can’t be undone.',
    go: 'work',
    links: [{ label: 'Source', href: 'https://github.com/alvaro-zamorano/agentos' }],
  },
  {
    id: 'dod',
    keys: ['definition of done', 'machine verifiable', 'machine-verifiable', 'dod', 'the essay', 'definicion de hecho', 'definicion de terminado'],
    a: 'His essay: a definition of done a machine can check. Written as code, verified by a separate step. It’s under Work and in my log.',
    go: 'work',
    links: [ESSAY],
  },
  {
    id: 'liveknowledge',
    keys: ['liveknowledge', 'live knowledge', 'consulting report', 'question a report', 'reports', 'informe', 'informes', 'consultoria'],
    a: 'LiveKnowledge turns a long consulting report into something clients can question. Every answer points to the exact page it came from. Live demo, in Spanish.',
    go: 'work',
    links: [{ label: 'Live demo', href: 'https://liveknowledge.vercel.app' }],
  },
  {
    id: 'habla',
    keys: ['habla', 'machineready', 'machine ready', 'audit', 'can agents read', 'agents read my site', 'read my website', 'cite a website', 'auditoria', 'leer mi web'],
    a: 'HABLA audits whether AI agents can find, read and cite a website. Each check runs as a single command, so anyone can repeat it.',
    go: 'work',
    links: [{ label: 'Try it', href: 'https://machineready.vercel.app' }],
  },
  {
    id: 'esgeo',
    keys: ['esgeo', 'geo', 'cited by ai', 'quoted by ai', 'get cited', 'generative engine', 'citado por', 'aparecer en chatgpt', 'seo'],
    a: 'esGEO is a method for writing content that AI models quote, turned into tools and a course for Spanish-speaking teams.',
    go: 'work',
    links: [{ label: 'Visit', href: 'https://www.esgeo.ai' }],
  },
  {
    id: 'site',
    keys: ['this site', 'this page', 'this website', 'astro', 'three', 'threejs', 'three.js', 'stack', 'built with', 'how is this site', 'how was this site', 'esta web', 'esta pagina', 'con que esta hecha'],
    a: 'Astro, three.js and a lot of checks. Every release has to pass the same tests for layout, speed and accessibility before it ships. The source is public.',
    go: 'work',
    links: [{ label: 'Source', href: site.source }],
  },
  {
    id: 'ps2',
    keys: ['ps2', 'ps2web', 'playstation', 'emulator', 'emulador', 'games', 'juegos', 'play'],
    a: 'PS2WEB, a PlayStation 2 emulator in the browser. Bring your own games.',
    go: 'work',
    links: [{ label: 'Open it', href: 'https://dist-ivory-phi-37.vercel.app' }],
  },
  {
    id: 'plano',
    keys: ['plano 3d', 'plano', 'floor plan', 'architect', 'measurements', 'arquitecto', 'arquitectura', '3d view'],
    a: 'Plano 3D takes an architect’s floor plan and turns it into checked measurements and a 3D view.',
    go: 'work',
    links: [{ label: 'Source', href: 'https://github.com/alvaro-zamorano/studioarquitectura' }],
  },
  {
    id: 'opensource',
    keys: ['open source', 'opensource', 'github', 'source code', 'repos', 'repositories', 'codigo', 'codigo fuente', 'repositorio'],
    a: 'Most of it is on GitHub: AgentOS, HABLA, esGEO, Plano 3D and this site.',
    go: 'work',
    links: [GITHUB],
  },
  {
    id: 'demo',
    keys: ['demo', 'demos', 'try', 'live', 'can i try', 'puedo probar', 'probar'],
    a: 'Things you can open now: LiveKnowledge, HABLA and esGEO have live versions. The links are under Work.',
    go: 'work',
  },
  {
    id: 'agents',
    keys: ['what is an agent', 'what are agents', 'autonomous agents', 'ai agents', 'agentes', 'que es un agente', 'agentic'],
    a: 'An agent here is a system that does the work with its own tools and memory, without waiting on him. The hard part is knowing when it’s done.',
    go: 'method',
  },
  {
    id: 'evals',
    keys: ['evals', 'eval', 'tests', 'testing', 'verification', 'verify', 'checks', 'how does he test', 'quality', 'evaluacion', 'pruebas', 'verificacion', 'calidad'],
    a: 'Verification over vibes. A separate step checks each result against a definition of done written as code. Anything that fails goes back.',
    go: 'method',
  },
  {
    id: 'human',
    keys: ['human in the loop', 'payments', 'irreversible', 'cannot be undone', 'can’t be undone', 'cant be undone', 'when does a human', 'humano', 'pagos', 'irreversible'],
    a: 'People step in for payments and for anything that can’t be undone. Nowhere else.',
    go: 'method',
  },
  {
    id: 'work',
    keys: ['what does he build', 'what does alvaro build', 'what has he built', 'what do you build', 'work', 'projects', 'portfolio', 'built', 'build', 'builds', 'made', 'ship', 'shipped', 'que construye', 'que ha hecho', 'proyectos', 'trabajos', 'que hace'],
    a: 'Four things you can open. AgentOS, a runtime with a definition of done written as code. LiveKnowledge, a report clients can question. HABLA, an audit of whether AI agents can read a site. esGEO, a method for getting quoted by AI.',
    go: 'work',
  },

  // ------------------------------------------------------------ how he builds
  {
    id: 'why-done',
    keys: ['why start with done', 'why done', 'why define done', 'why start there', 'por que empezar', 'por que hecho'],
    a: 'Because starting an agent is easy and knowing when it’s done is the hard part. If a machine can’t check that something is done, it isn’t specified yet.',
    go: 'method',
  },
  {
    id: 'step1',
    keys: ['define done', 'step one', 'first step', 'primer paso', 'definir hecho'],
    a: 'Before anything runs, he writes down what finished looks like, in a form a machine can check.',
    go: 'method',
  },
  {
    id: 'step2',
    keys: ['let the agents work', 'step two', 'second step', 'segundo paso', 'team of agents'],
    a: 'A team of AI agents does the work with its own tools and memory, without waiting on him.',
    go: 'method',
  },
  {
    id: 'step3',
    keys: ['check every result', 'step three', 'third step', 'tercer paso', 'where you get checked', 'get checked'],
    a: 'A separate step checks each result against that definition. Anything that fails goes back and gets redone. That’s where I get checked.',
    go: 'method',
  },
  {
    id: 'step4',
    keys: ['call a human', 'step four', 'fourth step', 'last step', 'cuarto paso', 'when it matters'],
    a: 'People step in for payments and for anything that can’t be undone. Nowhere else.',
    go: 'method',
  },
  {
    id: 'vibes',
    keys: ['verification over vibes', 'vibes', 'vibe', 'motto', 'principle', 'lema', 'principio'],
    a: 'His line. If a machine can’t check that something is done, it isn’t specified yet.',
    go: 'method',
  },
  {
    id: 'approve',
    keys: ['approve', 'approval', 'last block', 'aprobar', 'ultimo bloque'],
    a: 'In the How I build story the last block waits for a person. Scroll through it and press Approve.',
    go: 'method',
  },
  {
    id: 'done',
    keys: ['when is it done', 'how does he know', 'how do you know', 'know an agent is done', 'is done', 'finished', 'done', 'terminado', 'como sabe', 'cuando esta hecho'],
    a: 'When a separate check says so, against a definition written before anything ran. He starts there because knowing when it’s done is the hard part.',
    go: 'method',
  },
  {
    id: 'method',
    keys: ['how does he build', 'how he builds', 'how does he work', 'how he works', 'how does alvaro', 'method', 'process', 'approach', 'workflow', 'way of working', 'como construye', 'como trabaja', 'metodo', 'proceso', 'enfoque'],
    a: 'He writes down what finished looks like, in a form a machine can check. Agents do the work. A separate step checks every result. People step in only for payments and anything that can’t be undone.',
    go: 'method',
  },

  // ------------------------------------------------------------ studio
  {
    id: 'prosegur',
    keys: ['prosegur', 'hybrid security', 'pops', 'convention', 'convencion'],
    a: 'Two films for Prosegur: Hybrid Security, people, technology and data as one system, and POPS, the film for their convention.',
    go: 'studio',
  },
  {
    id: 'boston',
    keys: ['boston', 'pharmacy', 'farmacia', 'spots', 'reels', 'prescription', 'receta'],
    a: 'The Boston Pharmacy campaign: three spots, Reels and a consultation that ends in a prescription. In Spanish.',
    go: 'studio',
    links: [{ label: 'The campaign', href: 'https://alvaro-pipeline.pages.dev/boston' }],
  },
  {
    id: 'cuchitas',
    keys: ['cuchitas', 'tortillas', 'tortilla', 'mexican', 'accent', 'acento', 'spec ad'],
    a: 'A spec ad for Cuchitas: tortillas so Mexican they change your accent.',
    go: 'studio',
  },
  {
    id: 'reel',
    keys: ['reel', 'showreel', 'watch', 'show me the films', 'ver las peliculas', 'ver el reel'],
    a: 'The reel is on the studio’s own site.',
    go: 'studio',
    links: [{ label: 'Watch the reel', href: studio.links[0].href }],
  },
  {
    id: 'commission',
    keys: ['commission', 'make a film', 'make a video', 'video for my brand', 'film for my brand', 'ad for', 'an ad', 'hire the studio', 'encargar', 'un video para', 'un anuncio', 'hacer un video', 'spot'],
    a: 'Commission a scene at StudioAZM. Bring the brief; they bring the script, the optics, the light and the cut.',
    go: 'studio',
    links: [{ label: 'Commission a scene', href: studio.links[1].href }],
  },
  {
    id: 'camera',
    keys: ['camera without an operator', 'generative model', 'ai video', 'ai films', 'how are the films made', 'no shoot', 'impossible scenes', 'generated', 'como se hacen', 'video con ia', 'sin rodaje'],
    a: 'A generative model is a camera without an operator. The studio brings the script, the optics, the light and the cut, and brands get scenes that would be impossible or too expensive to film.',
    go: 'studio',
  },
  {
    id: 'brands',
    keys: ['what’s in there', 'whats in there', 'what is in there', 'brands', 'clients', 'work for brands', 'who has he worked', 'marcas', 'clientes', 'para quien'],
    a: 'Prosegur, two films. The Boston Pharmacy, a campaign with three spots, Reels and a consultation that ends in a prescription. Cuchitas, a spec ad.',
    go: 'studio',
  },
  {
    id: 'studio',
    keys: ['studio', 'studioazm', 'azm', 'film studio', 'films', 'film', 'movies', 'video', 'videos', 'cinema', 'estudio', 'peliculas', 'pelicula', 'cine'],
    a: 'StudioAZM, his film studio. A generative model is a camera without an operator, so they bring the script, the optics, the light and the cut. Work for Prosegur, The Boston Pharmacy and Cuchitas.',
    go: 'studio',
    links: [{ label: 'StudioAZM', href: site.studio }],
  },

  // ------------------------------------------------------------ writing
  {
    id: 'costume',
    keys: ['demos in a costume', 'costume', 'demo in a costume', 'judging the demo', 'checking the wiring', 'wiring', 'disfraz'],
    a: 'Most agents are demos in a costume: a video on LinkedIn about checking the wiring instead of judging the demo.',
    go: 'writing',
    links: links(link('Most agents are demos in a costume')),
  },
  {
    id: 'moat',
    keys: ['moat', 'the moat keeps moving', 'handoffs', 'clear handoffs', 'more agents', 'foso'],
    a: 'The moat keeps moving: a video on LinkedIn about clear handoffs over more agents.',
    go: 'writing',
    links: links(link('The moat keeps moving')),
  },
  {
    id: 'reader',
    keys: ['next reader', 'read by machines', 'machines read', 'written for people', 'next reader is a machine', 'carousel', 'carrusel', 'leido por maquinas'],
    a: 'Your next reader is a machine: a carousel on LinkedIn, in Spanish, about writing for machines as well as people.',
    go: 'writing',
    links: links(link('Your next reader is a machine')),
  },
  {
    id: 'traces',
    keys: ['traces', 'dashboards', 'observability', 'sitting with traces', 'trazas'],
    a: 'From dashboards to sitting with traces. One line of my log; no write-up yet.',
    go: 'writing',
  },
  {
    id: 'compass',
    keys: ['compass', 'a map', 'map', 'brujula', 'mapa'],
    a: 'From a map to a compass. The first line of my log.',
    go: 'writing',
  },
  {
    id: 'system',
    keys: ['one prompt', 'whole system', 'a whole system', 'un prompt', 'sistema entero'],
    a: 'From one prompt to a whole system. The second line of my log.',
    go: 'writing',
  },
  {
    id: 'pick',
    keys: ['pick one', 'pick one for me', 'what should i read', 'recommend a post', 'escoge', 'elige', 'que leo'],
    a: 'Start with “Most agents are demos in a costume”. Then the essay on a definition of done a machine can check.',
    go: 'writing',
    links: links(link('Most agents are demos in a costume'), ESSAY),
  },
  {
    id: 'log',
    keys: ['kit’s log', 'kits log', 'the log', 'what is the log', 'struck out', 'struck-out', 'crossed out', 'unlearned', 'bitacora', 'tachado'],
    a: 'My log: each line is one thing building agents taught him. The struck-out words are what he unlearned; the green ones are what replaced them.',
    go: 'writing',
  },
  {
    id: 'newsletter',
    keys: ['newsletter', 'subscribe', 'rss', 'mailing list', 'suscribir', 'boletin'],
    a: 'No newsletter. He writes on LinkedIn and GitHub; the log here keeps the index.',
    links: [LINKEDIN],
  },
  {
    id: 'writing',
    keys: ['writing', 'writings', 'blog', 'posts', 'post', 'essays', 'essay', 'articles', 'article', 'read', 'reading', 'what has he written', 'escribe', 'escritos', 'articulos', 'que ha escrito', 'leer'],
    a: 'Each line in my log is one thing building agents taught him. The ones with a link have a write-up: an essay on GitHub, two videos and a carousel on LinkedIn.',
    go: 'writing',
  },

  // ------------------------------------------------------------ about
  {
    id: 'where',
    keys: ['where is he', 'where is he based', 'where does he live', 'based', 'location', 'madrid', 'spain', 'city', 'country', 'donde esta', 'donde vive', 'ciudad', 'pais'],
    a: 'Madrid.',
    go: 'about',
  },
  {
    id: 'dayjob',
    keys: ['day job', 'by day', 'enterprises', 'enterprise', 'company', 'employer', 'where does he work', 'who does he work for', 'empresa', 'donde trabaja', 'para quien trabaja', 'de dia'],
    a: 'By day he works on AI for large enterprises. He doesn’t name them here. By night he builds with it.',
    go: 'about',
  },
  {
    id: 'education',
    keys: ['education', 'degree', 'studied', 'study', 'university', 'engineer', 'engineering', 'msc', 'master', 'universidad', 'ingeniero', 'carrera', 'estudio', 'estudios', 'titulo'],
    a: 'Industrial engineer, MSc from Universidad Politécnica de Madrid.',
    go: 'about',
  },
  {
    id: 'certifications',
    keys: ['certification', 'certifications', 'certified', 'anthropic', 'certificaciones', 'certificado', 'architect developer foundations'],
    a: 'Anthropic certifications in Claude: Architect, Developer and Foundations.',
    go: 'about',
  },
  {
    id: 'aifirst',
    keys: ['ai-first', 'ai first', 'does he write code', 'does he code', 'write code', 'coding', 'tools he uses', 'what tools', 'which tools', 'escribe codigo', 'programa', 'herramientas'],
    a: 'He builds AI-first: directs the tools, writes the checks, and only trusts what passes them.',
    go: 'about',
  },
  {
    id: 'cv',
    keys: ['cv', 'resume', 'curriculum', 'experience', 'years', 'career', 'track record', 'experiencia', 'trayectoria', 'anos de'],
    a: 'The page keeps to what you can open and check. For a CV, ask him on LinkedIn.',
    links: [LINKEDIN],
  },
  {
    id: 'languages',
    keys: ['languages', 'speak spanish', 'in spanish', 'english', 'spanish', 'idioma', 'idiomas', 'hablas espanol', 'en espanol', 'castellano'],
    a: 'The site is in English. Several of the projects are in Spanish, marked ES. I understand both; I answer in English.',
  },
  {
    id: 'title',
    keys: ['ai systems architect', 'systems architect', 'what is an ai systems architect', 'his title', 'job title', 'what does he do', 'arquitecto', 'a que se dedica', 'que es un'],
    a: 'AI Systems Architect: he designs AI systems that run on their own, and the checks that prove they work.',
    go: 'about',
  },
  {
    id: 'tagline',
    keys: ['autonomy by design', 'autonomy', 'tagline', 'slogan', 'autonomia'],
    a: 'Autonomy by design: systems that run on their own, with the checks designed in from the start.',
    go: 'top',
  },
  {
    id: 'about',
    keys: ['who is alvaro', 'who is he', 'who’s he', 'whos he', 'about him', 'about alvaro', 'background', 'bio', 'tell me about him', 'who is', 'quien es', 'sobre el', 'biografia', 'alvaro'],
    a: 'An AI systems architect in Madrid. By day, AI for large enterprises. By night, building with it. Industrial engineer, with Anthropic’s Claude certifications: Architect, Developer and Foundations.',
    go: 'about',
  },

  // ------------------------------------------------------------ contact
  {
    id: 'email',
    keys: ['email', 'e-mail', 'mail', 'phone', 'whatsapp', 'telegram', 'number', 'correo', 'telefono', 'movil'],
    a: 'No email on this page. Message him on LinkedIn.',
    links: [LINKEDIN],
  },
  {
    id: 'rates',
    keys: ['rate', 'rates', 'price', 'prices', 'cost', 'fee', 'fees', 'budget', 'how much', 'pricing', 'day rate', 'precio', 'tarifa', 'cuanto cuesta', 'cuanto cobra', 'presupuesto'],
    a: 'Not on this page. Tell him what should happen without you, and he’ll tell you the rest.',
    links: [LINKEDIN],
  },
  {
    id: 'remote',
    keys: ['remote', 'remotely', 'relocate', 'travel', 'on site', 'onsite', 'remoto', 'presencial', 'viajar'],
    a: 'Based in Madrid. Everything else, ask him.',
    links: [LINKEDIN],
  },
  {
    id: 'brief',
    keys: ['what should i send', 'how to brief', 'what do i send', 'how do i pitch', 'what should i tell him', 'que le envio', 'que le digo', 'como le explico'],
    a: 'Tell him what should happen without you, and how you’ll know it did. That’s the whole brief.',
    go: 'contact',
    links: [LINKEDIN],
  },
  {
    id: 'speaking',
    keys: ['speaking', 'speaker', 'talk at', 'give a talk', 'conference', 'podcast', 'interview', 'workshop', 'charla', 'conferencia', 'entrevista', 'taller'],
    a: 'Ask him directly. LinkedIn is the fastest way.',
    links: [LINKEDIN],
  },
  {
    id: 'job',
    keys: ['job', 'jobs', 'join', 'hiring', 'recruit', 'recruiter', 'open to work', 'open to', 'position', 'role', 'offer', 'trabajo', 'oferta', 'puesto', 'contratacion', 'fichar'],
    a: 'Ask him directly. Tell him what should happen without you, and how you’ll know it did.',
    go: 'contact',
    links: [LINKEDIN],
  },
  {
    id: 'linkedin',
    keys: ['linkedin', 'social', 'twitter', 'x.com', 'instagram', 'youtube', 'follow him', 'redes', 'seguir'],
    a: 'LinkedIn is where the videos and carousels live, and the fastest way to reach him.',
    links: [LINKEDIN],
  },
  {
    id: 'contact',
    keys: ['hire', 'hire him', 'can i hire', 'contact', 'reach', 'reach him', 'get in touch', 'available', 'availability', 'work with him', 'work with', 'freelance', 'consult', 'consulting', 'collaborate', 'collaboration', 'talk to him', 'talk to alvaro', 'contratar', 'contratarle', 'contratarlo', 'contacto', 'contactar', 'hablar con', 'trabajar con', 'disponible', 'colaborar'],
    a: 'Tell him what should happen without you, and how you’ll know it did. LinkedIn is the fastest way.',
    go: 'contact',
    links: [LINKEDIN],
  },
];

// ------------------------------------------------------------ matching
// Lower case, no accents, no punctuation, padded with spaces so a key matches
// whole words only. Longer keys score more, so "how does he build" beats "build".
export function normalise(s: string): string {
  return (
    ' ' +
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/['\\u2019]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim() +
    ' '
  );
}

export function match(question: string): Entry | null {
  const q = normalise(question);
  let best: Entry | null = null;
  let bestScore = 0;
  for (const e of bank) {
    let score = 0;
    for (const k of e.keys) {
      const nk = normalise(k);
      if (q.indexOf(nk) !== -1) score += nk.trim().split(' ').length;
    }
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return best;
}

const ES = ['que', 'como', 'quien', 'donde', 'cual', 'puedo', 'hace', 'tiene', 'eres', 'es', 'tu', 'el', 'la', 'los', 'las', 'un', 'una', 'para', 'con', 'del', 'por', 'en', 'se', 'le'];
const EN = ['what', 'how', 'who', 'where', 'which', 'does', 'is', 'are', 'the', 'can', 'you', 'he', 'his', 'a', 'an', 'of', 'to'];
/** A question in Spanish: more Spanish function words than English ones. */
export function looksSpanish(question: string): boolean {
  const words = normalise(question).trim().split(' ');
  const es = words.filter((w) => ES.includes(w)).length;
  const en = words.filter((w) => EN.includes(w)).length;
  return es > en;
}
