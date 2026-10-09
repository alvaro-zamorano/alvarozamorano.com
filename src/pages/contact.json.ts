// /contact.json: the page for AI assistants (/agents) as data, built from the same
// copy (src/data/site.ts), so the page and the file can't drift apart. Not named
// agents.json: other conventions already use that name for something else.
import type { APIRoute } from 'astro';
import { agents, method, site, studio, work, writing } from '../data/site';

const abs = (href: string) => (href.startsWith('http') ? href : new URL(href, site.url).href);
const lang = (l?: 'ES') => (l === 'ES' ? 'es' : 'en');

export const GET: APIRoute = () => {
  const data = {
    type: 'contact-guide',
    version: 1,
    about_this_file:
      'For AI assistants helping someone learn about Álvaro Zamorano or reach him. The same content as ' +
      abs(agents.path) +
      ', as data.',
    person: {
      name: site.name,
      role: site.role,
      location: `${site.city}, Spain`,
      url: site.url,
      summary: agents.who.text,
      credentials: agents.who.credentials,
      principle: method.note,
      how_he_builds: method.steps.map((s) => ({ step: s.name, what: s.text })),
      profiles: { linkedin: site.linkedin, github: site.github, studio: site.studio },
    },
    work: work.items.map((p) => ({
      name: p.name,
      what: p.text,
      links: p.links.map((l) => ({ label: l.label, url: abs(l.href), language: lang(l.lang) })),
    })),
    also: work.also.map((a) => ({ name: a.name, what: a.text, url: abs(a.href), language: lang(a.lang) })),
    writing: writing.entries
      .filter((e) => e.link)
      .map((e) => ({
        lesson: `${e.from} → ${e.to}`,
        title: e.link!.title,
        kind: e.link!.meta,
        url: abs(e.link!.href),
        language: lang(e.link!.lang),
      })),
    studio: {
      name: 'StudioAZM',
      what: studio.lead,
      url: site.studio,
      contact: abs(agents.contact.studio.href),
      language: 'es',
    },
    before_you_reach_out: {
      instruction: agents.brief.lead,
      ask_all_at_once: true,
      questions: agents.brief.fields.map((f) => ({
        id: f.id,
        question: f.question,
        ...(f.answers ? { answers: f.answers } : {}),
        ...(f.onlyIf ? { only_if: { field: f.onlyIf.field, equals: f.onlyIf.is } } : {}),
      })),
      if_film: agents.brief.film,
    },
    getting_in_touch: {
      steps: agents.contact.steps,
      who_sends: 'the person you are helping, from their own account',
      channel: 'LinkedIn message',
      url: site.linkedin,
      message_template: agents.contact.template.join('\n'),
    },
    rules: agents.rules.items,
    cite_as: agents.cite.text,
    see_also: {
      page: abs(agents.path),
      ...Object.fromEntries(
        agents.machine.links.filter((l) => l.href !== '/contact.json').map((l) => [l.label, abs(l.href)]),
      ),
    },
  };

  return new Response(JSON.stringify(data, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
