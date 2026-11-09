// The playground's UI text in English and Turkish, and a pure lookup. No DOM: `main.js` applies it.
// Not translated: the validator's error lines (core), the prompt for the AI (`prompt.js`) and
// the recipe JSON. English is the default and matches the text in `index.html` exactly.

export const DEFAULT_LANGUAGE = 'en';

/** Every UI string, keyed by language, then by key; `{name}` marks a parameter. */
export const STRINGS = {
  en: {
    'example.label': 'Example',
    'example.choose': 'Choose an example',
    'lang.group': 'Language',
    'ask.label': 'Describe the sound (any language)',
    'ask.placeholder': 'A small boat\'s single-cylinder diesel engine',
    'ask.copy': 'Copy prompt',
    'prompt.label': 'The prompt: select it, copy it and paste it into your AI',
    'recipe.label': 'Paste a recipe (JSON, or the whole reply of your AI)',
    'recipe.placeholder': 'Choose an example above, or paste a recipe here, then press Load.',
    'transport.load': 'Load',
    'transport.play': 'Play',
    'transport.stop': 'Stop',
    'transport.wav': 'Download WAV',
    'transport.seconds': 'Seconds',
    'channels.title': 'Inputs and events',
    'channels.empty': 'A loaded recipe\'s inputs and game events show here; some recipes have none.',
    'event.strength': '{id} strength',
    'scene.title': 'Listener scene',
    'scene.sourceRole': 'movable sound source',
    'scene.source': 'Sound source',
    'scene.help': 'Seen from above: the listener (triangle) stands in the middle, facing up. Drag the sound source (circle), or focus it with Tab and move it with the arrow keys (Shift: 10 m a step). The square is 100 m across; the dashed circle is the reference distance.',
    'scene.readout': 'Distance {distance} m · gain {gain} ({db} dB) · pan {pan}',
    'scene.reference': 'reference (m)',
    'scene.rolloff': 'rolloff',
    'status.notLoadedOne': 'Not loaded: the recipe has {count} error.',
    'status.notLoadedMany': 'Not loaded: the recipe has {count} errors.',
    'status.loaded': 'Loaded "{name}".',
    'status.audioError': 'The audio thread reported an error.',
    'status.rendering': 'Rendering {seconds} s of "{name}"...',
    'status.downloaded': 'Downloaded {file} ({seconds} s, mono, 16-bit, {rate} Hz).',
    'status.copied': 'Prompt copied. Paste it into your AI, then paste its reply into the recipe box below.',
    'status.copyRefused': 'The browser did not allow copying: copy the prompt above by hand, then paste your AI\'s reply into the recipe box.',
    // Messages other playground modules return, or main.js throws, in English (`fromEnglish` recognises them).
    'events.pressPlayFirst': 'Press Play first, then fire the event.',
    'events.stopped': 'The sound is stopped: press Play, then fire the event.',
    'text.tooLong': 'the text is {length} characters; at most {max} are accepted',
    'text.noBlock': 'no { ... } block found in the text',
    'text.empty': 'paste a recipe first',
    'text.notClosed': 'the { ... } block is not closed: a } is missing or a string is not terminated',
    'text.notJson': 'not valid JSON: {detail}',
    'request.empty': 'Describe the sound first.',
    'request.tooLong': 'The description is {length} characters; at most {max} are accepted.',
    'fetch.failed': '{path}: HTTP {status}',
  },
  tr: {
    'example.label': 'Örnek',
    'example.choose': 'Bir örnek seçin',
    'lang.group': 'Dil',
    'ask.label': 'Sesi anlatın (herhangi bir dilde)',
    'ask.placeholder': 'Küçük bir teknenin tek silindirli dizel motoru',
    'ask.copy': 'Prompt\'u kopyala',
    'prompt.label': 'Prompt: seçin, kopyalayın ve yapay zekânıza yapıştırın',
    'recipe.label': 'Bir tarif yapıştırın (JSON ya da yapay zekânızın cevabının tamamı)',
    'recipe.placeholder': 'Yukarıdan bir örnek seçin ya da buraya bir tarif yapıştırın, sonra Yükle\'ye basın.',
    'transport.load': 'Yükle',
    'transport.play': 'Çal',
    'transport.stop': 'Durdur',
    'transport.wav': 'WAV indir',
    'transport.seconds': 'Saniye',
    'channels.title': 'Girdiler ve olaylar',
    'channels.empty': 'Yüklenen tarifin girdileri ve oyun olayları burada görünür; bazı tariflerde hiç yoktur.',
    'event.strength': '{id} şiddeti',
    'scene.title': 'Dinleyici sahnesi',
    'scene.sourceRole': 'sürüklenebilir ses kaynağı',
    'scene.source': 'Ses kaynağı',
    'scene.help': 'Yukarıdan bakış: dinleyici (üçgen) ortada durur ve yukarı bakar. Ses kaynağını (daire) sürükleyin ya da Tab ile seçip ok tuşlarıyla taşıyın (Shift: adım başına 10 m). Kare 100 m genişliğindedir; kesikli daire referans mesafesidir.',
    'scene.readout': 'Mesafe {distance} m · kazanç {gain} ({db} dB) · pan {pan}',
    'scene.reference': 'referans (m)',
    'scene.rolloff': 'rolloff',
    'status.notLoadedOne': 'Yüklenmedi: tarifte {count} hata var.',
    'status.notLoadedMany': 'Yüklenmedi: tarifte {count} hata var.',
    'status.loaded': '"{name}" yüklendi.',
    'status.audioError': 'Ses iş parçacığı bir hata bildirdi.',
    'status.rendering': '"{name}" için {seconds} s ses oluşturuluyor...',
    'status.downloaded': '{file} indirildi ({seconds} s, mono, 16 bit, {rate} Hz).',
    'status.copied': 'Prompt kopyalandı. Yapay zekânıza yapıştırın, sonra cevabını aşağıdaki tarif kutusuna yapıştırın.',
    'status.copyRefused': 'Tarayıcı kopyalamaya izin vermedi: yukarıdaki prompt\'u elle kopyalayın, sonra yapay zekânızın cevabını tarif kutusuna yapıştırın.',
    'events.pressPlayFirst': 'Önce Çal\'a basın, sonra olayı tetikleyin.',
    'events.stopped': 'Ses durduruldu: Çal\'a basın, sonra olayı tetikleyin.',
    'text.tooLong': 'metin {length} karakter; en fazla {max} karakter kabul edilir',
    'text.noBlock': 'metinde { ... } bloğu bulunamadı',
    'text.empty': 'önce bir tarif yapıştırın',
    'text.notClosed': '{ ... } bloğu kapanmamış: bir } eksik ya da bir dize kapatılmamış',
    'text.notJson': 'geçerli JSON değil: {detail}',
    'request.empty': 'Önce sesi anlatın.',
    'request.tooLong': 'Açıklama {length} karakter; en fazla {max} karakter kabul edilir.',
    'fetch.failed': '{path} alınamadı: HTTP {status}',
  },
};

/** Turkish names of the bundled examples, keyed by their English `label` in `examples.js`. */
export const EXAMPLE_LABELS_TR = {
  'Diesel engine (Leeway)': 'Dizel motor (Leeway)',
  'Water along the hull (Leeway)': 'Gövde boyunca su (Leeway)',
  'City noise bed (Leeway)': 'Şehir ambiyansı (Leeway)',
  'Car horns (Leeway)': 'Araba kornaları (Leeway)',
  'Ferry horn (Leeway)': 'Vapur düdüğü (Leeway)',
  'Hull impact (Leeway)': 'Gövde darbesi (Leeway)',
  'Gull (Leeway)': 'Martı (Leeway)',
  'UI click (classic)': 'Arayüz tıklaması (klasik)',
  'Jump (classic)': 'Zıplama (klasik)',
  'Explosion (classic)': 'Patlama (klasik)',
  'Wind (classic)': 'Rüzgâr (klasik)',
};

/** Keys whose English text other modules produce; `fromEnglish` maps that text back to its key. */
const FOREIGN_KEYS = Object.keys(STRINGS.en).filter((key) => /^(events|text|request|fetch)\./.test(key));

const PARAM = /\{(\w+)\}/g;

/** True for a language code the page has strings for. */
export function isLanguage(lang) {
  return Object.hasOwn(STRINGS, lang);
}

/**
 * The text of `key` in `lang`, with each `{name}` replaced by `params[name]`.
 * Throws on an unknown key or language, so a typo fails loudly.
 */
export function translate(lang, key, params = {}) {
  const template = STRINGS[lang]?.[key];
  if (template === undefined) throw new Error(`no ${lang} string for "${key}"`);
  return template.replace(PARAM, (whole, name) => (Object.hasOwn(params, name) ? String(params[name]) : whole));
}

/** An example's label in `lang`: the English label itself, or its Turkish name. */
export function exampleLabel(lang, label) {
  return lang === 'tr' ? EXAMPLE_LABELS_TR[label] ?? label : label;
}

/**
 * Turns an English message from another playground module (events, recipe text, prompt) into
 * `{ key, params }`, so it can be shown in any language; null when the text is not one of them.
 */
export function fromEnglish(text) {
  if (text.length > 1000) return null;  // shortcut: the lazy groups are quadratic; every known message is far shorter
  for (const key of FOREIGN_KEYS) {
    const names = [];
    const pattern = STRINGS.en[key].split(PARAM).map((part, i) => {
      if (i % 2 === 0) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      names.push(part);
      return '([\\s\\S]*?)';
    }).join('');
    const match = new RegExp(`^${pattern}$`).exec(text);
    if (match) return { key, params: Object.fromEntries(names.map((name, i) => [name, match[i + 1]])) };
  }
  return null;
}
