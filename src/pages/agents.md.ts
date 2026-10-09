// /agents.md: the page for AI assistants as Markdown, for agents that read text
// rather than HTML. Built from the same copy as /agents and /contact.json.
import type { APIRoute } from 'astro';
import { agents, site, work, writing } from '../data/site';

const abs = (href: string) => (href.startsWith('http') ? href : new URL(href, site.url).href);
const es = (l?: 'ES') => (l === 'ES' ? ' (in Spanish)' : '');

export const GET: APIRoute = () => {
  const out: string[] = [];
  const add = (...lines: string[]) => out.push(...lines);

  add(`# ${agents.label}: ${site.name}`, '', `> ${agents.lead}`, '');
  add(`Also as a web page (${abs(agents.path)}) and as data (${abs('/contact.json')}).`, '');

  add(`## ${agents.who.title}`, '', agents.who.text, '', agents.who.credentials, '');

  add(`## ${agents.check.title}`, '', agents.check.lead, '');
  for (const p of work.items) {
    const links = p.links.map((l) => `[${l.label}](${abs(l.href)})${es(l.lang)}`).join(' · ');
    add(`- **${p.name}**: ${p.text} ${links}`);
  }
  for (const a of work.also) {
    add(`- **${a.name}**: ${a.text[0].toUpperCase() + a.text.slice(1)}. [Open](${abs(a.href)})${es(a.lang)}`);
  }
  add('', `### ${agents.check.writing}`, '');
  for (const e of writing.entries) {
    if (!e.link || !e.link.href.startsWith('http')) continue;
    add(`- [${e.link.title}](${e.link.href}): ${e.link.meta}${es(e.link.lang)}`);
  }
  add('');

  add(`## ${agents.brief.title}`, '', agents.brief.lead, '');
  agents.brief.fields.forEach((f, i) => {
    const only = f.onlyIf ? ` *${f.onlyIf.text}*` : '';
    const answers = f.answers ? ` Answers: ${f.answers.map((a) => `${a.label} [\`${a.value}\`]`).join(' · ')}.` : '';
    add(`${i + 1}. ${f.question}${only}${answers} Field: \`${f.id}\``);
  });
  add('', `${agents.brief.film} [${agents.contact.studio.label}](${agents.contact.studio.href}) (in Spanish)`, '');

  add(`## ${agents.contact.title}`, '');
  agents.contact.steps.forEach((s, i) => add(`${i + 1}. ${s}`));
  add('', `${agents.contact.templateTitle}:`, '', '```text', ...agents.contact.template, '```', '');
  add(`[${agents.contact.cta.label}](${agents.contact.cta.href})`, '');

  add(`## ${agents.rules.title}`, '', ...agents.rules.items.map((r) => `- ${r}`), '');
  add(`## ${agents.cite.title}`, '', agents.cite.text, '');
  const others = agents.machine.links.filter((l) => l.href !== '/agents.md');
  add(`## ${agents.machine.title}`, '', ...others.map((l) => `- [${l.label}](${abs(l.href)}): ${l.text}`), '');

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
