
import { Post, Project, SiteContent, AtelierBlock } from '../types';

const STORAGE_KEYS = {
  POSTS: 'zencms_posts',
  PROJECTS: 'zencms_projects_v5', 
  CONTENT: 'zencms_content_v3', // Updated key for new atelier structure
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
    leftColumn: [
      {
        id: '1',
        type: 'image',
        content: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2940&auto=format&fit=crop'
      },
      {
        id: '2',
        type: 'text',
        content: "ATELIER HAJNÝ se zaměřuje na architekturu ticha a prostoru. Věříme, že prázdnota není absencí, ale příležitostí. Naše projekty hledají rovnováhu mezi funkčností a estetikou minimalismu."
      }
    ],
    rightColumn: [
      {
        id: '3',
        type: 'text',
        content: "Filosofie\n\nMéně, ale lépe. Odstranění nepodstatného, aby vyniklo to důležité. Pracujeme s přirozeným světlem, surovými materiály a kontextem krajiny. Každá čára má svůj význam, každý detail svůj důvod."
      },
      {
        id: '4',
        type: 'text',
        content: "Služby\n\n• Architektonické studie\n• Interiérový design\n• Urbanismus\n• Konzultace"
      }
    ]
  },
  contact: {
    address: "Nitranská 19, 130 00 Praha 3, Česká Republika",
    email: "hello@zencms.studio",
    phone: "+420 123 456 789"
  }
};

// --- IndexedDB Helper ---
const DB_NAME = 'AtelierHajnyDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbInstance: IDBDatabase | null = null;

const getDB = async (): Promise<IDBDatabase> => {
  if (dbInstance) return dbInstance;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

const dbGet = async <T>(key: string): Promise<T | undefined> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('DB Get Error', e);
    return undefined;
  }
};

const dbSet = async (key: string, value: any): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// -- Projects --
export const saveProjects = async (projects: Project[]): Promise<void> => {
  try {
    await dbSet(STORAGE_KEYS.PROJECTS, projects);
  } catch (e) {
    console.error('Failed to save projects', e);
  }
};

export const loadProjects = async (): Promise<Project[]> => {
  try {
    // 1. Try IndexedDB
    const stored = await dbGet<Project[]>(STORAGE_KEYS.PROJECTS);
    if (stored) return stored;

    // 2. Migration from localStorage
    const local = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        await dbSet(STORAGE_KEYS.PROJECTS, parsed);
        // We can optionally clear localStorage here to free up space
        // localStorage.removeItem(STORAGE_KEYS.PROJECTS); 
        return parsed;
      } catch (err) {
        console.warn('Failed to parse local projects', err);
      }
    }
    
    // 3. Default
    return DEFAULT_PROJECTS;
  } catch (e) {
    return DEFAULT_PROJECTS;
  }
};

// -- Site Content --
export const saveContent = async (content: SiteContent): Promise<void> => {
  try {
    await dbSet(STORAGE_KEYS.CONTENT, content);
  } catch (e) {
    console.error('Failed to save content', e);
  }
};

export const loadContent = async (): Promise<SiteContent> => {
  try {
    let content: SiteContent | null | undefined = await dbGet<SiteContent>(STORAGE_KEYS.CONTENT);

    if (!content) {
      const local = localStorage.getItem(STORAGE_KEYS.CONTENT);
      if (local) {
        try {
          content = JSON.parse(local);
          if (content) await dbSet(STORAGE_KEYS.CONTENT, content);
        } catch (err) {
          console.warn('Failed to parse local content', err);
        }
      }
    }

    // Default if still null
    if (!content) content = DEFAULT_CONTENT;
    
    // Migration Logic for Atelier structure (legacy check)
    let atelier = content.atelier || DEFAULT_CONTENT.atelier;
    if (!atelier.leftColumn && !atelier.rightColumn) {
       // Migrate old format to new format
       const oldAtelier = atelier as any;
       atelier = {
         title: oldAtelier.title || "Atelier",
         leftColumn: oldAtelier.image ? [
           { id: 'mig-1', type: 'image', content: oldAtelier.image }
         ] : [],
         rightColumn: [
           { id: 'mig-2', type: 'text', content: oldAtelier.intro || '' },
           { id: 'mig-3', type: 'text', content: `Filosofie\n${oldAtelier.philosophy || ''}` },
           { id: 'mig-4', type: 'text', content: `Služby\n${(oldAtelier.services || []).join('\n')}` }
         ]
       };
    }

    return {
      ...DEFAULT_CONTENT,
      ...content,
      branding: { ...DEFAULT_CONTENT.branding, ...(content.branding || {}) },
      analytics: { ...DEFAULT_CONTENT.analytics, ...(content.analytics || {}) },
      seo: { ...DEFAULT_CONTENT.seo, ...(content.seo || {}) },
      categories: content.categories || DEFAULT_CONTENT.categories,
      hero: {
        ...DEFAULT_CONTENT.hero,
        ...(content.hero || {}),
        textColor: content.hero?.textColor || DEFAULT_CONTENT.hero.textColor
      },
      atelier: atelier,
      contact: { ...DEFAULT_CONTENT.contact, ...(content.contact || {}) }
    };
  } catch (e) {
    return DEFAULT_CONTENT;
  }
};

// -- Posts --
export const savePosts = async (posts: Post[]): Promise<void> => {
  try {
    await dbSet(STORAGE_KEYS.POSTS, posts);
  } catch (e) {
    console.error('Failed to save posts', e);
  }
};

export const loadPosts = async (): Promise<Post[]> => {
  try {
    const stored = await dbGet<Post[]>(STORAGE_KEYS.POSTS);
    if (stored) return stored;

    const local = localStorage.getItem(STORAGE_KEYS.POSTS);
    if (local) {
      const parsed = JSON.parse(local);
      await dbSet(STORAGE_KEYS.POSTS, parsed);
      return parsed;
    }

    return [];
  } catch (e) {
    return [];
  }
};

// -- Auth --
export const savePassword = async (password: string): Promise<void> => {
  try {
    await dbSet(STORAGE_KEYS.PASSWORD, password);
  } catch (e) {
    console.error('Failed to save password', e);
  }
};

export const loadPassword = async (): Promise<string> => {
  try {
    const stored = await dbGet<string>(STORAGE_KEYS.PASSWORD);
    if (stored) return stored;

    const local = localStorage.getItem(STORAGE_KEYS.PASSWORD);
    if (local) {
      await dbSet(STORAGE_KEYS.PASSWORD, local);
      return local;
    }
    
    return 'admin123';
  } catch (e) {
    return 'admin123';
  }
};