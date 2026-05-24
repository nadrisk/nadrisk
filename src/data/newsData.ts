export interface NewsEntry {
  title: string;
  description: string;
  date: string;
  link?: { url: string; text: string };
  imageUrl?: string;
  youtubeId?: string;
}

export const newsEntries: NewsEntry[] = [
  {
    title: "raster. open call soundtrack europe 2025",
    description: 'My track "Cadere" which was shortlisted for the raster. soundtrack europe 20—25 is now featured on their compo CD. Insanely proud that one of my tracks is featured on a raster-media compo.',
    date: "15 Aug. 2025",
    link: { url: "https://raster-media.net/shop/merch/raster-open-call-soundtrack-europe-2025/", text: "Check it out! buy a copy" },
  },
  {
    title: "Joint Goods Vol. 1",
    description: "Ojela and I dropped our collab as part of the Joint Goods compo hosted by assemblyline.",
    date: "15 Aug. 2025",
    link: { url: "https://on.soundcloud.com/xSVkTo3LHMFFgsZSCk", text: "Check it out!" },
  },
  {
    title: "Damaged Goods vol.100",
    description: "Just dropped a new track as part of Damaged Goods vol.100!",
    date: "2 Aug. 2025",
    link: { url: "https://on.soundcloud.com/3qwplHJRUi63FtwDcg", text: "Check it out!" },
  },
  {
    title: "Damaged Goods vol.99",
    description: "Just dropped a new track as part of Damaged Goods vol.99, an experimental compilation by the amazing @assemblyline.",
    date: "5 Apr. 2025",
    link: { url: "https://on.soundcloud.com/zhXZJUYuxgtUmffG9", text: "Check it out!" },
  },
  {
    title: "Raster. OpenCall",
    description: "Excited to share that my track 'Cadere' was shortlisted for the raster. soundtrack europe 20—25 open call! Big thanks to Raster Media for the opportunity and congrats to the winners!",
    date: "1 Apr. 2025",
    link: { url: "https://europe2025.raster-media.net/repetition/", text: "Check out my entry." },
  },
  {
    title: "Biltravenium (PAKAL Remix)",
    description: "One of the tracks from my Cyberneuro EP has been remixed by the legendary PAKAL from the Cyberneuro Discord! He's given it a jazzy twist—check it out!",
    date: "28 Mar. 2025",
  },
  {
    title: "Protocol EP",
    description: "This EP is my tribute to Cyberneuro, the movement pioneered by Billain. Inspired by the crew's energy and innovation, it's packed with twisted bass, intricate design, and cyberpunk rhythms. Big respect to Cyberneuro—this one's for the movement!",
    date: "20 Mar. 2025",
  },
  {
    title: '"Vihor" got featured on Hiljadu Decibela',
    description: "'Vihor' was featured on the legendary Slovenian 'Radio Študent'! Huge thanks to Radio Študent!",
    date: "19 Mar. 2025",
    link: { url: "https://radiostudent.si/glasba/hiljadu-decibela/hiljadu-decibela-59", text: "Be sure to check it out" },
  },
  {
    title: "Blank (Single)",
    description: "I just dropped a new track called 'Blank'! It's a Trip-Hop piece, a style I've been eager to explore for a while.",
    date: "20 Feb. 2025",
    youtubeId: "QcJvoTKeWzg",
  },
  {
    title: "Vihor / Databent 360 VR Visualizer",
    description: "Check out the insane visualizer I created for 'Vihor'! It features a 360 VR video that I intentionally databent by editing its hex code, resulting in some seriously wild glitch artifacts. Be warned, it's intense, and viewers with epilepsy should proceed with caution.",
    date: "17 Jan. 2025",
    youtubeId: "_aRi0HFIN9A",
  },
  {
    title: "Vihor feat. Stribor (Single)",
    description: "This is a truly special release! I teamed up with my talented friend, the amazing guitarist Stribor, to create a mind-blowing 180BPM Breakcore track featuring his signature guitar playing. Hope you enjoy the whirlwind!",
    date: "17 Jan. 2025",
  },
  {
    title: "Vacant Glow (Single)",
    description: "I released a haunting track called 'Vacant Glow.' This release is particularly special because the melody came to me during a sleepless night, guiding me into rest and inspiring the entire piece.",
    date: "30 Oct. 2024",
    youtubeId: "nAblmS7WcNs",
  },
  {
    title: "Nadrisk | Selections",
    description: "As an added bonus, here's a specially curated playlist featuring some of my favorite tracks, handpicked for Phantom.Corp™.",
    date: "4 Nov. 2024",
    link: { url: "https://www.youtube.com/playlist?list=PLRWVQzmkVo_UOQH0-sRGXGG-xQpRFC9vb", text: "Watch playlist" },
  },
  {
    title: "Cinematic Mix for Phantom.Corp™ x AfthrsNeo",
    description: "Exciting news! I've been invited to create a cinematic electronic music mix for a special release from Phantom.Corp and AfthrsNeo. I'm thrilled to share this unique curation with you all. Huge thanks to Phantom.Corp and AfthrsNeo for this incredible opportunity!",
    date: "4 Nov. 2024",
    youtubeId: "Omm6xwZShUs",
  },
  {
    title: "BH Demo Liga",
    description: "Check out this massive Spotify playlist showcasing the best of Bosnia's alternative music scene—featuring yours truly and many other amazing artists! Huge thanks to O.P. BHRT for the support!",
    date: "29 Oct. 2024",
  },
  {
    title: "KARAI",
    description: "Check out this Hip-Hop collab I did with the rap duo Skankagram and Zima! This track features one of my favorite beats I've ever created!",
    date: "25 Aug. 2024",
  },
  {
    title: "Dua Lipa - Illusion (Nadrisk Remix)",
    description: "I joined the Skiomusic Dua Lipa Remix Contest! This might be one of my dirtiest Dubstep tracks.",
    date: "22 Aug. 2024",
    link: { url: "https://skiomusic.com/nadrisk/dua-lipa-illusion-nadrisk-remix", text: "Check it out" },
  },
  {
    title: "Honored to be Featured in HAAD's Latest Story!",
    description: "Thrilled to be mentioned in Ladies In magazine's article on Adnan Hajrulahović HAAD's latest collection, Mektub – Zapis iz cvjetnog vrta! Grateful for the recognition.",
    date: "14 Aug. 2024",
    link: { url: "https://www.ladiesin.ba/mektub-zapis-iz-cvjetnog-vrta-nova-modna-kolekcija-adnana-hajrulahovic-haad-a/", text: "Read more" },
  },
  {
    title: 'Music For "Mektub" by Haad',
    description: "I'm thrilled to announce that I had the honor of creating the music for the runway show of one of Bosnia's top fashion designers, Haad. It was a privilege to contribute to such an extraordinary event.",
    date: "8 Aug. 2024",
  },
  {
    title: "Tragovi (Single)",
    description: "I released 'Tragovi,' a new Future Garage track that features highly emotional vocals and driving beats from some very special drum recordings I made. Super excited for this release.",
    date: "16 Apr. 2024",
  },
  {
    title: "New audio/visual experiment",
    description: "Check out this point cloud animation I made with TouchDesigner. I even did some spectral sound design to compliment it and bring it to life.",
    date: "4 Apr. 2024",
  },
  {
    title: "Got third place on Machinedrum's Compo 2!",
    description: "Thrilled to share that I snagged 3rd place in the Machinedrum Compo 2 beat battle! 🔥 Check out this clip of Machinedrum reacting to my entry – his feedback is priceless!",
    date: "30 Jan. 2024",
  },
  {
    title: "Crave (Single)",
    description: "I released 'Crave,' a track entirely made with the Behringer Crave synthesizer. I also created a special visualizer, which you can check out on my YouTube page.",
    date: "26 Jan. 2024",
  },
  {
    title: "Inter.net Records",
    description: 'And we got our second label release! "Void Runner" and "The Lake" got released on the US label inter.net.',
    date: "8 Jan. 2024",
  },
  {
    title: "MÂGLĂ [CEAȚĂ]",
    description: "Check out this awesome bike ride video featuring my music in the background! Huge shoutout to NUFO BIKE TRIP for including my tracks!",
    date: "23 Dec. 2023",
  },
  {
    title: "LMNL Records",
    description: 'We got our first label release! "Wounded by Light" got released under the Sheffield based label LMNL Records.',
    date: "1 Dec. 2023",
  },
  {
    title: "Vision Radio",
    description: 'The amazing Billain co-hosted VISION Radio again and he played "Hidden Keystone"! Thank you Billain! <3',
    date: "22 Nov. 2023",
  },
  {
    title: "Featured by Dreamer",
    description: '"Inner Construct" got featured by the YouTube music curator Dreamer. Look for 9:10min',
    date: "8 Nov. 2023",
  },
  {
    title: "Held In The Moment (Single)",
    description: "First ambiental track! Pause and explore the moment you're in right now with this track as your background music.",
    date: "12 Nov. 2023",
  },
  {
    title: "Featured by Dreamer",
    description: '"Cold Air" got featured by the YouTube music curator Dreamer. Look for 22:35min',
    date: "6 Sep. 2023",
  },
  {
    title: "Inner Construct (Single)",
    description: 'After experimenting with new sound design techniques I created a new track called "Inner Construct". These new and interesting sounds I created evoke thoughts of the brain and neurons, sparking a reflective and introspective mood within.',
    date: "5 Nov. 2023",
  },
  {
    title: "I joined the HTIF Beat Battle",
    description: "Thrilled to share that my track snagged 6th place in Flume's Discord beat battle!",
    date: "6 Sep. 2023",
  },
  {
    title: "Cold Air (Single)",
    description: 'I released my new track "Cold Air". This track is reminiscent of the Megaton EP.',
    date: "2 Sep. 2023",
  },
  {
    title: "Mystic Work (EP)",
    description: "I released six new tracks! These compositions seamlessly navigate the intersection of cinematic and electronic music. Leveraging new sound design techniques developed over the past few months, I've crafted a sonic experience that pushes boundaries.",
    date: "23 Apr. 2023",
  },
  {
    title: "Triler feat. Chutx",
    description: "Nadrisk and Chutx strike again! This is probably the greatest beat I've ever made and Chutx best performance.",
    date: "12 Mar. 2023",
  },
  {
    title: "Vision Radio",
    description: 'Bosnias greatest producer Billain shared "Blurred Lights" on the VISION Radio podcast!',
    date: "1 Mar. 2023",
  },
  {
    title: "MArteLive Europe Semifinals",
    description: "I won the MArteLive Europe Semifinals as the best DJ/Producer in the Blue Area! This achievement means a lot, and I want to express my gratitude for all the support you've given me. Thank you from the bottom of my heart <3",
    date: "15 Oct. 2022",
  },
  {
    title: "Magla (EP)",
    description: "Magla got an update! I added three new tracks to the Magla collection and released them on Bandcamp. Enjoy!",
    date: "7 Oct. 2022",
  },
  {
    title: "Megaton (EP)",
    description: "First EP! I just released eight new tracks. They are dark and moody and I can't wait for you to check them out.",
    date: "7 Oct. 2022",
  },
  {
    title: "Charting in the Top 15",
    description: 'Chutx and Nadrisk are killing it again! Our track "Gilgamesh" got featured on the BHRT Top 15 and is now charting at the 2nd place!',
    date: "6 Sep. 2022",
  },
  {
    title: '"Corrupted Bastard" got played live by Magnetude',
    description: 'Thrilling news! The collaboration track I did with Inao and Kolonok "Corrupted Bastard" got played live on one of the biggest dnb festivals in the world by no other than Magnetude!',
    date: "6 Aug. 2022",
  },
  {
    title: "Corrupted Bastard (Single)",
    description: 'Inao, Kolonok, and I released a neurofunk track called "Corrupted Bastard" on the French record label Darkbass Records!',
    date: "1 May 2022",
  },
  {
    title: "Magla",
    description: "My hard work is finally paying off. I present to you my most important release yet!",
    date: "25 Sep. 2021",
  },
  {
    title: "I won 2nd place in a remix contest!",
    description: "MixbustTV selected my remix of 'Throat' as the second-best all-around remix in the competition.",
    date: "18 Mar. 2021",
  },
];
