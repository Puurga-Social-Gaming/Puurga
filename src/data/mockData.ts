export const MOCK_USERS = [
  {
    id: '1',
    name: 'Thabo Mbeki',
    username: 'thabombeki',
    location: 'Johannesburg, GP',
    website: 'puurga.com/thabombeki',
    joinDate: 'March 2024',
    avatar: '/images/avatars/thabo.png',
    coverImage: '/images/covers/joburg-skyline.jpg'
  },
  {
    id: '2',
    name: 'Lerato Kganyago',
    username: 'leratokganyago',
    location: 'Pretoria, GP',
    avatar: '/images/avatars/lerato.png',
    coverImage: '/images/covers/union-buildings.jpg'
  },
  {
    id: '3',
    name: 'Siya Kolisi',
    username: 'siyakolisi',
    location: 'Cape Town, WC',
    avatar: '/avatars/siya.jpg'
  },
  {
    id: '4',
    name: 'Bonang Matheba',
    username: 'bonang',
    location: 'Sandton, GP',
    avatar: '/avatars/bonang.jpg'
  },
  {
    id: '5',
    name: 'Trevor Noah',
    username: 'trevornoah',
    location: 'Cape Town, WC',
    avatar: '/avatars/trevor.jpg'
  }
];

export const MOCK_POSTS = [
  {
    id: '1',
    userId: '1',
    content: 'Just had an amazing braai in Soweto! 🔥 The spirit of Ubuntu is alive! #PuurgaSA',
    createdAt: new Date().toISOString(),
    user: MOCK_USERS[0],
    likes: 124,
    comments: 45,
    puurgas: 67
  },
  {
    id: '2',
    userId: '2',
    content: 'Beautiful sunset at the Union Buildings today 🌅 Pretoria showing off! #MyCity',
    createdAt: new Date().toISOString(),
    user: MOCK_USERS[1],
    likes: 89,
    comments: 23,
    puurgas: 34
  },
  {
    id: '3',
    userId: '3',
    content: 'Table Mountain looking majestic this morning! 🏔️ #CapeTown #PuurgaViews',
    createdAt: new Date().toISOString(),
    user: MOCK_USERS[2],
    likes: 156,
    comments: 42,
    puurgas: 78
  },
  {
    id: '4',
    userId: '4',
    content: 'Loving the vibe at the Neighbourgoods Market! 🛍️ #MabonengPrecinct',
    createdAt: new Date().toISOString(),
    user: MOCK_USERS[3],
    likes: 245,
    comments: 67,
    puurgas: 92
  },
  {
    id: '5',
    userId: '5',
    content: 'Just performed at the State Theatre! 🎭 Grateful for the amazing crowd! #PretoriaLove',
    createdAt: new Date().toISOString(),
    user: MOCK_USERS[4],
    likes: 180,
    comments: 60,
    puurgas: 80
  }
];

export const ACHIEVEMENTS = [
  { 
    icon: 'trophy',
    name: 'Mzansi Pioneer',
    description: 'Early adopter in South Africa'
  },
  {
    icon: 'flame',
    name: 'Local Legend',
    description: 'Top trending in SA'
  },
  {
    icon: 'users',
    name: 'Ubuntu Builder',
    description: 'Created thriving local groups'
  },
  {
    icon: 'zap',
    name: 'African Innovator',
    description: 'Leading tech contributor'
  }
];

export const PUURGA_STATS = {
  survivalRate: '92%',
  purgeResistance: 'High',
  allianceStrength: '95%',
  communityTrust: '97%',
  innovationScore: '89%'
}; 