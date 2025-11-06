import icon from '../assets/icon.png';
import Lbg from '../assets/Login.png'
import google from '../assets/google.png'
import Home from '../assets/Home.svg'
import Profile from '../assets/Profile.svg'
import Chat from '../assets/Chat.svg'
import Setting from '../assets/Setting.svg'
import pIcon from '../assets/Frame.png'
import profile from '../assets/bgprofile.png'
import profilePic from "../assets/Frame.png";
import bgImg from "../assets/bgprofile.png";
import profilePic1 from "../assets/Frame.png";
import profilePic2 from "../assets/icon.png";
import postImg1 from "../assets/Login.png";
import postImg2 from "../assets/google.png";
import { BsPerson, BsGlobe, BsKey, BsClockHistory, BsShieldLock, BsThreeDots, BsBoxArrowRight } from 'react-icons/bs';
import Sample from '../assets/video.mp4'

// import profile1 from "../assets/friend1.png";
// import profile2 from "../assets/friend2.png";
// import profile3 from "../assets/friend3.png";
// import profile4 from "../assets/friend4.png";
// import profile5 from "../assets/friend5.png";
// import profile6 from "../assets/friend6.png";

export const assert = {
    Logo: icon,
    Login:Lbg,
    Glogin:google,
    photo:pIcon,
    profilebg:profile
}

export const Head = [
  { id: 1, name: "Home", icon: Home },
  { id: 2, name: "Profile", icon: Profile },
  { id: 3, name: "Chat", icon: Chat },
  { id: 4, name: "Setting", icon: Setting },
];


export const ProfileData = [{
  id: 1,
  name: "Elviz Dizzouza",
  username: "@elvizoodem",
  description: "⭐ Hello, I’m UI / UX designer. Open to the new Project ⭐",
  profileImage: profilePic,
  backgroundImage: bgImg,
  followers: 1984,
  following: 1002,
  skills: [
    "UX/UI Designer",
    "Front end and Back End developer",
    "Web Developer",
  ],
  media: [
    { type: "image", url: "https://splice-res.cloudinary.com/image/upload/f_auto,q_auto,w_auto/c_limit,w_450/v1699475462/xa1f7xp1njmgwnxxtae0.jpg" },
    { type: "image", url: "https://i.pinimg.com/474x/96/81/5e/96815e73e12821df2d3c91e19393b3c5.jpg" },
    { type: "video", url: Sample},
  ]
}];

export const Posts = [
  {
    id: 1,
    author: {
      id: 1,
      name: "Elviz Dizzouza",
      username: "@elvizoodem",
      profileImage: profilePic1,
    },
    content: "Excited to share my new UI project 🚀✨ #UI #Design",
    media: postImg1,
    isVideo: false,
    likes: 245,
    comments: [
      { id: 1, user: "JohnDoe", text: "Looks amazing 🔥" },
      { id: 2, user: "Jane", text: "Great job 👏👏" },
    ],
    timestamp: "2 hours ago",
  },
  {
    id: 2,
    author: {
      id: 2,
      name: "Alex Johnson",
      username: "@alex_dev",
      profileImage: profilePic2,
    },
    content: "Working on a MERN stack project 💻 #CodingLife",
    media: postImg2,
    isVideo: false,
    likes: 150,
    comments: [
      { id: 1, user: "Sam", text: "Keep going bro 💪" },
      { id: 2, user: "Mia", text: "Nice project idea!" },
    ],
    timestamp: "5 hours ago",
  },
  {
    id: 3,
    author: {
      id: 101,
      name: "George Jose",
      username: "@georgejose",
      profileImage: profilePic1,
    },
    content: "Just finished a great workout session! 💪 #Fitness #Health",
    media: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    isVideo: false,
    likes: 89,
    comments: [
      { id: 1, user: "Mike", text: "Keep it up!" },
    ],
    timestamp: "1 hour ago",
  },
  {
    id: 4,
    author: {
      id: 101,
      name: "George Jose",
      username: "@georgejose",
      profileImage: profilePic1,
    },
    content: "Exploring new photography techniques 📸 #Photography",
    media: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    isVideo: false,
    likes: 120,
    comments: [
      { id: 1, user: "Anna", text: "Beautiful shots!" },
    ],
    timestamp: "3 hours ago",
  },
  {
    id: 5,
    author: {
      id: 102,
      name: "Michel",
      username: "@michel_dev",
      profileImage: profilePic2,
    },
    content: "Learning React hooks today! 🎉 #React #JavaScript",
    media: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop",
    isVideo: false,
    likes: 67,
    comments: [
      { id: 1, user: "Tom", text: "Hooks are awesome!" },
    ],
    timestamp: "4 hours ago",
  },
  {
    id: 6,
    author: {
      id: 103,
      name: "Cristano",
      username: "@cristano",
      profileImage: profilePic1,
    },
    content: "Cooking up something delicious in the kitchen 🍳 #Cooking",
    media: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
    isVideo: false,
    likes: 95,
    comments: [
      { id: 1, user: "Lisa", text: "Looks yummy!" },
    ],
    timestamp: "6 hours ago",
  },
  {
    id: 7,
    author: {
      id: 104,
      name: "Brahim Diaz",
      username: "@brahimdiaz",
      profileImage: profilePic2,
    },
    content: "Weekend hiking adventure! 🏔️ #Nature #Adventure",
    media: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop",
    isVideo: false,
    likes: 134,
    comments: [
      { id: 1, user: "Sara", text: "Amazing view!" },
    ],
    timestamp: "8 hours ago",
  },
  {
    id: 8,
    author: {
      id: 105,
      name: "John Wick",
      username: "@johnwick",
      profileImage: profilePic1,
    },
    content: "Reading a great book on productivity 📖 #Reading",
    media: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
    isVideo: false,
    likes: 78,
    comments: [
      { id: 1, user: "Emma", text: "What's the book?" },
    ],
    timestamp: "10 hours ago",
  },
  {
    id: 9,
    author: {
      id: 106,
      name: "Abhilash Jose",
      username: "@abhilashjose",
      profileImage: profilePic2,
    },
    content: "Gaming session with friends 🎮 #Gaming",
    media: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop",
    isVideo: false,
    likes: 112,
    comments: [
      { id: 1, user: "David", text: "Which game?" },
    ],
    timestamp: "12 hours ago",
  },
];



export const Friend = [
  {
    id: 101,
    name: "George Jose",
    isVerified: true,
    action: "Followed on you",
    time: "3 min ago",
    profileImage: profilePic1
  },
  {
    id: 102,
    name: "Michel",
    isVerified: true,
    action: "Followed on you",
    time: "3 min ago",
    profileImage: profilePic2
  },
  {
    id: 103,
    name: "Cristano",
    isVerified: true,
    action: "Followed on you",
    time: "3 min ago",
    profileImage: profilePic1
  },
  {
    id: 104,
    name: "Brahim Diaz",
    isVerified: true,
    action: "Followed on you",
    time: "3 min ago",
    profileImage: profilePic2
  },
  {
    id: 105,
    name: "John Wick",
    isVerified: true,
    action: "Followed on you",
    time: "3 min ago",
    profileImage: profilePic1
  },
  {
    id: 106,
    name: "Abhilash Jose",
    isVerified: true,
    action: "Followed on you",
    time: "3 min ago",
    profileImage: profilePic2
  },
];

export const chatData = {
  activeChats: [
    {
      id: 1,
      name: "John",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      isOnline: true,
      lastMessage: "hi good morning",
      lastMessageTime: "1m"
    },
    {
      id: 2,
      name: "Abhilash",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      isOnline: false,
      lastMessage: "hey! where are you???",
      lastMessageTime: "2m"
    },
    {
      id: 3,
      name: "George Jose",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      isOnline: true,
      lastMessage: "Now im in france",
      lastMessageTime: "3m"
    },
    {
      id: 4,
      name: "Hani Rahman",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      isOnline: false,
      lastMessage: "hi good morning",
      lastMessageTime: "1h"
    },
    {
      id: 5,
      name: "Aman",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
      isOnline: true,
      lastMessage: "How is This?",
      lastMessageTime: "5m"
    }
  ]
};

export const chatSettings = {
  notifications: true,
  soundEnabled: true,
  darkMode: true,
  readReceipts: true,
  messagePreview: true
};

export const menu = [
  { id: 1, labelKey: 'settings.account', icon: BsPerson },
  { id: 2, labelKey: 'settings.appsWebsite', icon: BsGlobe },
  { id: 3, labelKey: 'settings.changePassword', icon: BsKey },
  { id: 4, labelKey: 'settings.activityLog', icon: BsClockHistory },
  { id: 5, labelKey: 'settings.privacySecurity', icon: BsShieldLock },
  { id: 6, labelKey: 'settings.others', icon: BsThreeDots },
  { id: 7, labelKey: 'settings.logOut', icon: BsBoxArrowRight },
];

export const generateDummyProfile = (userId) => {
  const dummyNames = [
    "Alex Johnson", "Sarah Wilson", "Mike Chen", "Emma Davis", "Chris Brown",
    "Lisa Garcia", "Tom Anderson", "Anna Martinez", "David Lee", "Maria Rodriguez"
  ];

  const name = dummyNames[(userId - 1) % dummyNames.length] || `User ${userId}`;
  const username = `@${name.toLowerCase().replace(/\s+/g, '')}`;

  return {
    id: userId,
    name: name,
    username: username,
    description: "Social media enthusiast and content creator",
    profileImage: profilePic,
    backgroundImage: bgImg,
    followers: Math.floor(Math.random() * 1000) + 50,
    following: Math.floor(Math.random() * 500) + 20,
    skills: ["Social Media", "Content Creation", "Networking"],
  };
};






