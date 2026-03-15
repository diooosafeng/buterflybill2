// Using Microsoft Fluent Emojis (3D Style) hosted via a reliable CDN
const BASE_URL = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals";

// Selected cute animals matching the "Pixar 3D" vibe
const ANIMALS = [
  "Cat Face", "Dog Face", "Panda", "Rabbit Face", "Hamster",
  "Ewe", "Pig Face", "Duck", "Otter", "Fox", 
  "Deer", "Penguin", "Koala", "Polar Bear", "Wolf", 
  "Owl", "Shark", "Leopard", "Bear", "Chicken", 
  "Cow Face", "Dragon Face", "Frog", "Lion", "Monkey Face", 
  "Mouse Face", "Tiger Face", "Unicorn", "Hatching Chick", "Sloth"
];

export const getRandomAvatar = (): string => {
  const name = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  // Use encodeURIComponent to handle spaces in filenames (e.g., "Cat Face.png")
  return `${BASE_URL}/${encodeURIComponent(name)}.png`;
};

// Helpers for specific mock data to ensure fixed demo characters have nice avatars
export const getAvatarByName = (animalName: string): string => {
  const name = ANIMALS.find(a => a.toLowerCase().includes(animalName.toLowerCase())) || ANIMALS[0];
  return `${BASE_URL}/${encodeURIComponent(name)}.png`;
};

// Return a specific 3D emoji for the "Group/All" icon
export const getGroupAvatar = (): string => {
  // Using "Star-Struck" from Smilies as a fun "Group" icon
  return "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Star-Struck.png";
};