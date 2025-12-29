import { Post, Project, SiteContent } from '../types';

const STORAGE_KEYS = {
  POSTS: 'zencms_posts',
  PROJECTS: 'zencms_projects_v5', // Updated key to force refresh with thumbnails
  CONTENT: 'zencms_content_v2', // Updated key for categories
  PASSWORD: 'zencms_password'
};

// -- Mock Data Seed --
const DEFAULT_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Vila nad řekou',
    year: '2023',
    location: 'Praha-Západ',
    category: 'Bydlení',
    description: 'Rezidenční projekt zasazený do strmého svahu nad Vltavou. Dům využívá kaskádovité uspořádání teras pro maximální propojení s řekou. Interiér je definován hrou světla a stínu, kterou umožňují velkoformátová okna orientovaná na jih.',
    thumbnail: 'https://images.unsplash.com/photo-1600596542815-2a4d04774c71?q=80&w=2940&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1600596542815-2a4d04774c71?q=80&w=2940&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=1950&auto=format&fit=crop', // Portrait 3:4
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2940&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600210491892-03d54cc0c578?q=80&w=1950&auto=format&fit=crop', // Portrait 3:4
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=2940&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1615529328331-f8917597711f?q=80&w=1950&auto=format&fit=crop', // Portrait 3:4
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2940&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2940&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2940&auto=format&fit=crop'
    ]
  },
  {
    id: '2',
    title: 'Městský Ateliér',
    year: '2022',
    location: 'Brno',
    category: 'Interiéry',
    description: 'Rekonstrukce bývalé textilní továrny na kreativní pracovní prostory. Důraz na zachování industriálního charakteru a dostatek difuzního světla.',
    thumbnail: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2874&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2874&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2900&auto=format&fit=crop'
    ]
  },
  {
    id: '3',
    title: 'Brutalistický Loft',
    year: '2024',
    location: 'Ostrava',
    category: 'Interiéry',
    description: 'Interiér definovaný surovým betonem a ocelí. Otevřená dispozice umožňuje flexibilní vyuostí prostoru pro bydlení i výstavy umění.',
    thumbnail: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=2940&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=2940&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1598928636135-d146006ff4be?q=80&w=2940&auto=format&fit=crop'
    ]
  },
  {
    id: '4',
    title: 'Severská Chata',
    year: '2021',
    location: 'Krkonoše',
    category: 'Bydlení',
    description: 'Horský úkryt inspirovaný skandinávskou architekturou. Dřevěná fasáda časem zešedne a splyne s okolním lesem.',
    thumbnail: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=2940&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=2940&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=2940&auto=format&fit=crop'
    ]
  },
  {
    id: '5',
    title: 'Administrativní Centrum',
    year: '2023',
    location: 'Plzeň',
    category: 'Občanské stavby',
    description: 'Nová dominanta administrativní čtvrti. Skleněná fasáda s inteligentním stíněním zajišťuje optimální klima a výhledy.',
    thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2940&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2940&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2940&auto=format&fit=crop'
    ]
  },
  {
    id: '6',
    title: 'Rekonstrukce Mlýna',
    year: '2020',
    location: 'Jižní Čechy',
    category: 'Bydlení',
    description: 'Citlivá obnova historického objektu s respektem k původním řemeslným prvkům a doplněním moderních technologií.',
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2940&auto=format&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2940&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?q=80&w=2940&auto=format&fit=crop'
    ]
  }
];

const DEFAULT_CONTENT: SiteContent = {
  branding: {
    logo: '',
    favicon: ''
  },
  analytics: {
    googleId: ''
  },
  seo: {
    title: 'ATELIER HAJNÝ | Moderní architektura a design',
    keywords: 'architektura, design, minimalismus, atelier hajny, projekty vily',
    description: 'ATELIER HAJNÝ se zaměřuje na architekturu ticha a prostoru. Věříme, že prázdnota není absencí, ale příležitostí.'
  },
  categories: ["Bydlení", "Občanské stavby", "Veřejný prostor", "Interiéry", "Urbanismus", "Ostatní"],
  hero: {
    title: "Architektura ticha \n a prostoru",
    subtitle: "Tvoříme místa, která dýchají. Hledáme rovnováhu mezi světlem, hmotou a prázdnotou.",
    image: "",
    video: "",
    buttonText: "",
    textPosition: 'center',
    textSize: 'lg',
    textColor: '#000000'
  },
  atelier: {
    title: "Atelier",
    intro: "ATELIER HAJNÝ se zaměřuje na architekturu ticha a prostoru. Věříme, že prázdnota není absencí, ale příležitostí. Naše projekty hledají rovnováhu mezi funkčností a estetikou minimalismu. Pracujeme s přirozeným světlem, surovými materiály a kontextem krajiny. Každá čára má svůj význam, každý detail svůj důvod.",
    philosophy: "Méně, ale lépe. Odstranění nepodstatného, aby vyniklo to důležité.",
    services: [
      "Architektonické studie",
      "Interiérový design",
      "Urbanismus",
      "Konzultace"
    ],
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2940&auto=format&fit=crop"
  },
  contact: {
    address: "Nitranská 19, 130 00 Praha 3, Česká Republika",
    email: "hello@zencms.studio",
    phone: "+420 123 456 789"
  }
};

// -- Projects --
export const saveProjects = (projects: Project[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects', e);
  }
};

export const loadProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return stored ? JSON.parse(stored) : DEFAULT_PROJECTS;
  } catch (e) {
    return DEFAULT_PROJECTS;
  }
};

// -- Site Content --
export const saveContent = (content: SiteContent): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTENT, JSON.stringify(content));
  } catch (e) {
    console.error('Failed to save content', e);
  }
};

export const loadContent = (): SiteContent => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTENT);
    if (!stored) return DEFAULT_CONTENT;
    
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_CONTENT,
      ...parsed,
      branding: {
        ...DEFAULT_CONTENT.branding,
        ...(parsed.branding || {})
      },
      analytics: {
        ...DEFAULT_CONTENT.analytics,
        ...(parsed.analytics || {})
      },
      seo: {
        ...DEFAULT_CONTENT.seo,
        ...(parsed.seo || {})
      },
      categories: parsed.categories || DEFAULT_CONTENT.categories,
      hero: {
        ...DEFAULT_CONTENT.hero,
        ...(parsed.hero || {}),
        textColor: parsed.hero?.textColor || DEFAULT_CONTENT.hero.textColor
      },
      atelier: {
        ...DEFAULT_CONTENT.atelier,
        ...(parsed.atelier || {})
      },
      contact: {
        ...DEFAULT_CONTENT.contact,
        ...(parsed.contact || {})
      }
    };
  } catch (e) {
    return DEFAULT_CONTENT;
  }
};

// -- Posts --
export const savePosts = (posts: Post[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  } catch (e) {
    console.error('Failed to save posts', e);
  }
};

export const loadPosts = (): Post[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.POSTS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

// -- Auth --
export const savePassword = (password: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PASSWORD, password);
  } catch (e) {
    console.error('Failed to save password', e);
  }
};

export const loadPassword = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PASSWORD);
    return stored || 'admin123';
  } catch (e) {
    return 'admin123';
  }
};