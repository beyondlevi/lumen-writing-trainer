// Every user-facing string lives in this file. English is the default;
// Brazilian Portuguese is chosen for any `pt-*` browser language. The words
// and phrases to write follow the "Content language" setting instead (see
// src/lumen/config.ts).
import type {Lang} from '../content/bank';

const en = {
  appName: 'Writing Trainer',
  homeLabel: 'Writing Trainer menu',
  streakDays: '{n} days',
  streakDay: '1 day',
  levelChip: 'Level {n}',
  wpm: '{wpm} wpm',
  xpToLevel: '{into} of {span} XP to level {next}',
  wordsRow: 'Words',
  wordsSub: 'Letter by letter · level {n} of {total}',
  phrasesRow: 'Phrases',
  phrasesSub: 'Words per minute',
  dailyRow: 'Daily challenge',
  dailySub: 'The letters the band misses most with you',
  dailyBonus: '+50 XP',
  dailyDone: 'Done',
  progressRow: 'Progress',
  progressSub: 'Speed, accuracy and letters',
  starsOf: '{n} of 3 stars',
  starEarned: 'Star earned',
  hintOpen: 'Index: open',
  hintExit: 'Middle: exit',

  trailWords: 'Words',
  trailPhrases: 'Phrases',
  trailMeta: 'level {n} of {total}',
  trailLabel: 'Levels',
  trailPlay: 'Index: play',
  trailLocked: 'Finish the level before',
  trailLockedLabel: '{title}, locked: finish the level before',
  trailLevelLabel: '{title}, {stars}',
  trailNew: 'not played yet',
  hintChoose: 'Swipe: choose',

  level_alphabet: 'Alphabet',
  level_short: '2 and 3 letters',
  level_medium: '4 and 5 letters',
  level_similar: 'Look-alike letters',
  level_accents: 'No accents',
  level_long: 'Long words',
  level_capitals: 'Capitals',
  level_master: 'Master',
  level_phrasesShort: 'Short',
  level_phrasesEveryday: 'Everyday',
  level_phrasesOther_en: 'In English',
  level_phrasesOther_pt: 'In Portuguese',
  level_phrasesFast: 'Fast',
  level_daily: 'Daily challenge',

  roundWords: 'Words',
  roundPhrases: 'Phrases',
  roundDaily: 'Daily challenge',
  roundMeta: '{n} of {total}',
  roundProgress: 'Word {n} of {total}',
  roundPhraseProgress: 'Phrase {n} of {total}',
  combo: 'Combo x{n}',
  points: '{n} pts',
  writePrompt: 'Write {word}',
  fieldLabel: 'Writing field: {text}',
  instructions: 'Write with your finger, one letter at a time. Push forward: next word.',
  instructionsCapitals: 'Write with your finger, one letter at a time. Swipe up first for a capital.',
  instructionsPhrase: 'Write the phrase, one letter at a time. Push forward: space.',
  wrongLetter: 'The band read “{read}”. Swipe back and write “{expected}” again.',
  wasLetter: 'was “{letter}”',
  letterNow: '{letter}, now',
  letterNext: '{letter}, next',
  letterRight: '{letter}, right',
  letterWrong: '{expected}, the band read {read}',
  wordPoints: '+{n}',
  wordClean: 'No errors',
  wordError: '1 error',
  wordErrors: '{n} errors',
  wordCombo: 'combo x{n}',
  wordNext: 'next: {word}',
  accentsNote: 'Write without accents: the band has no accented letters, and the app checks without them.',
  markedNote: 'The marked word had a letter swapped.',
  wpmNow: 'wpm now',
  time: 'time',
  accuracy: 'accuracy',
  preparing: 'Preparing the band…',
  paused: 'Paused',
  hintWrite: 'Index: write',
  hintLeave: 'Middle: exit',
  hintNext: 'Push: next',
  hintSpace: 'Push: space',
  hintErase: 'Swipe back: erase',
  hintStop: 'Middle: stop',
  hintContinue: 'Index: continue',
  hintLeaveRound: 'Middle: leave the round',

  resultHeader: 'Round complete',
  resultStats: 'Round results',
  speed: 'speed',
  speedRecord: 'speed · record!',
  maxCombo: 'top combo',
  xpGained: '+{n} XP',
  levelIn: 'level {level} in {xp}',
  xpProgress: '{into} of {span} XP to level {level}',
  trainLetters: 'Train:',
  trainNone: 'no misses',
  nextRound: 'Next round',
  repeatRound: 'Repeat',
  unlockedToast: 'New level: {title}',

  progressHeader: 'Progress',
  progressLabel: 'Speed this week and accuracy per letter',
  weekTitle: 'Words per minute, this week',
  lettersTitle: 'Accuracy per letter (%) · outlined: to train',
  dayBar: '{day}: {wpm}',
  dayNone: '{day}: no round',
  letterCell: '{letter}: {pct}%',
  letterNone: '{letter}: not written yet',
  none: '–',
};

export type StringKey = keyof typeof en;

const pt: Record<StringKey, string> = {
  appName: 'Treino de escrita',
  homeLabel: 'Menu do Treino de escrita',
  streakDays: '{n} dias',
  streakDay: '1 dia',
  levelChip: 'Nível {n}',
  wpm: '{wpm} ppm',
  xpToLevel: '{into} de {span} XP para o nível {next}',
  wordsRow: 'Palavras',
  wordsSub: 'Letra a letra · nível {n} de {total}',
  phrasesRow: 'Frases',
  phrasesSub: 'Palavras por minuto',
  dailyRow: 'Desafio do dia',
  dailySub: 'As letras que a band mais erra com você',
  dailyBonus: '+50 XP',
  dailyDone: 'Feito',
  progressRow: 'Progresso',
  progressSub: 'Velocidade, precisão e letras',
  starsOf: '{n} de 3 estrelas',
  starEarned: 'Estrela ganha',
  hintOpen: 'Indicador: abrir',
  hintExit: 'Médio: sair',

  trailWords: 'Palavras',
  trailPhrases: 'Frases',
  trailMeta: 'nível {n} de {total}',
  trailLabel: 'Níveis',
  trailPlay: 'Indicador: jogar',
  trailLocked: 'Faça o nível anterior',
  trailLockedLabel: '{title}, bloqueado: faça o nível anterior',
  trailLevelLabel: '{title}, {stars}',
  trailNew: 'ainda não jogado',
  hintChoose: 'Deslizar: escolher',

  level_alphabet: 'Alfabeto',
  level_short: '2 e 3 letras',
  level_medium: '4 e 5 letras',
  level_similar: 'Letras parecidas',
  level_accents: 'Sem acento',
  level_long: 'Longas',
  level_capitals: 'Maiúsculas',
  level_master: 'Mestre',
  level_phrasesShort: 'Curtas',
  level_phrasesEveryday: 'Do dia a dia',
  level_phrasesOther_en: 'Em inglês',
  level_phrasesOther_pt: 'Em português',
  level_phrasesFast: 'Rápidas',
  level_daily: 'Desafio do dia',

  roundWords: 'Palavras',
  roundPhrases: 'Frases',
  roundDaily: 'Desafio diário',
  roundMeta: '{n} de {total}',
  roundProgress: 'Palavra {n} de {total}',
  roundPhraseProgress: 'Frase {n} de {total}',
  combo: 'Combo x{n}',
  points: '{n} pts',
  writePrompt: 'Escreva {word}',
  fieldLabel: 'Campo de escrita: {text}',
  instructions: 'Escreva com o dedo, uma letra de cada vez. Empurrar para frente: próxima palavra.',
  instructionsCapitals: 'Escreva com o dedo, uma letra de cada vez. Para a maiúscula, deslize para cima antes.',
  instructionsPhrase: 'Escreva a frase, uma letra de cada vez. Empurrar para frente: espaço.',
  wrongLetter: 'A band leu “{read}”. Varra para trás e escreva “{expected}” de novo.',
  wasLetter: 'era “{letter}”',
  letterNow: '{letter}, agora',
  letterNext: '{letter}, a seguir',
  letterRight: '{letter}, certa',
  letterWrong: '{expected}, a band leu {read}',
  wordPoints: '+{n}',
  wordClean: 'Sem erro',
  wordError: '1 erro',
  wordErrors: '{n} erros',
  wordCombo: 'combo x{n}',
  wordNext: 'próxima: {word}',
  accentsNote: 'Escreva sem acentos: a band não tem letras acentuadas, e o app confere sem eles.',
  markedNote: 'A palavra marcada teve uma letra trocada.',
  wpmNow: 'ppm agora',
  time: 'tempo',
  accuracy: 'precisão',
  preparing: 'Preparando a band…',
  paused: 'Pausado',
  hintWrite: 'Indicador: escrever',
  hintLeave: 'Médio: sair',
  hintNext: 'Empurrar: próxima',
  hintSpace: 'Empurrar: espaço',
  hintErase: 'Varrer para trás: apagar',
  hintStop: 'Médio: parar',
  hintContinue: 'Indicador: continuar',
  hintLeaveRound: 'Médio: sair da rodada',

  resultHeader: 'Rodada concluída',
  resultStats: 'Resultado da rodada',
  speed: 'velocidade',
  speedRecord: 'velocidade · recorde!',
  maxCombo: 'maior combo',
  xpGained: '+{n} XP',
  levelIn: 'nível {level} em {xp}',
  xpProgress: '{into} de {span} XP para o nível {level}',
  trainLetters: 'Treinar:',
  trainNone: 'sem erros',
  nextRound: 'Próxima rodada',
  repeatRound: 'Repetir',
  unlockedToast: 'Novo nível: {title}',

  progressHeader: 'Progresso',
  progressLabel: 'Velocidade na semana e acerto por letra',
  weekTitle: 'Palavras por minuto, na semana',
  lettersTitle: 'Acerto por letra (%) · contornadas: a treinar',
  dayBar: '{day}: {wpm}',
  dayNone: '{day}: sem rodada',
  letterCell: '{letter}: {pct}%',
  letterNone: '{letter}: ainda não escrita',
  none: '–',
};

/** The interface language: Portuguese for `pt-*`, English otherwise. */
export function langOf(language: string | undefined): Lang {
  return language?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export const locale: Lang = langOf(typeof navigator === 'undefined' ? 'en' : navigator.language);
const catalog = locale === 'pt' ? pt : en;
const numberLocale = locale === 'pt' ? 'pt-BR' : 'en-US';

export function t(key: StringKey, values: Record<string, string | number> = {}): string {
  return catalog[key].replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/** Both catalogs, for the tests. */
export const catalogs = {en, pt};

const oneDecimal = new Intl.NumberFormat(numberLocale, {minimumFractionDigits: 1, maximumFractionDigits: 1});

/** A speed or other decimal value, as "9.4" or "9,4". */
export function decimal(value: number): string {
  return oneDecimal.format(value);
}

/** A share 0–1 as a whole percentage. */
export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** A duration as m:ss. */
export function duration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** A day's short weekday name, as "mon" or "seg". */
export function weekday(date: Date): string {
  return new Intl.DateTimeFormat(numberLocale, {weekday: 'short'}).format(date).replace('.', '').toLowerCase();
}
