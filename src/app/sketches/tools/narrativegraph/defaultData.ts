import { Actor, DialogNode } from "./page";

const dialogLibrary: Record<string, DialogNode> = {
    // Innkeeper dialogs
    "innkeeper_vip": {
        id: "innkeeper_vip",
        text: "Ah, a VIP guest! Your suite is ready on the top floor.",
        position: [100, 100],
        nextId: "innkeeper_end",
        requiredInventory: ["vip_card"]
    },
    "innkeeper_greeting": {
        id: "innkeeper_greeting",
        text: "Welcome to my inn! Need a room?",
        position: [100, 100],
        choices: [
            { text: "Yes, please", nextId: "innkeeper_rent" },
            { text: "Just looking around", nextId: "innkeeper_browse" }
        ]
        // No requirements - default fallback
    },
    "innkeeper_rent": {
        id: "innkeeper_rent",
        text: "That'll be 5 gold. Here's your key!",
        position: [100, 250],
        nextId: "innkeeper_end"
    },
    "innkeeper_browse": {
        id: "innkeeper_browse",
        text: "Feel free to look around. Let me know if you need anything.",
        position: [400, 250],
        nextId: "innkeeper_end"
    },
    "innkeeper_end": {
        id: "innkeeper_end",
        text: "Safe travels!",
        position: [250, 400]
    },

    // Guard dialogs
    "guard_criminal": {
        id: "guard_criminal",
        text: "You! Stop right there, criminal scum!",
        position: [100, 100],
        choices: [
            { text: "Run!", nextId: "guard_end" },
            { text: "Surrender", nextId: "guard_end" }
        ],
        requiredFlags: ["wanted"]
    },
    "guard_friendly": {
        id: "guard_friendly",
        text: "Good to see you again, friend! Go right ahead.",
        position: [100, 100],
        nextId: "guard_end",
        requiredFlags: ["guard_friend"],
        forbiddenFlags: ["wanted"]
    },
    "guard_halt": {
        id: "guard_halt",
        text: "Halt! State your business.",
        position: [100, 100],
        choices: [
            { text: "I'm just passing through", nextId: "guard_pass" },
            { text: "I have a delivery", nextId: "guard_delivery" }
        ]
        // No requirements - default fallback
    },
    "guard_pass": {
        id: "guard_pass",
        text: "Move along then, citizen.",
        position: [100, 250],
        nextId: "guard_end"
    },
    "guard_delivery": {
        id: "guard_delivery",
        text: "Let me see your papers.",
        position: [400, 250],
        nextId: "guard_end"
    },
    "guard_end": {
        id: "guard_end",
        text: "You may proceed.",
        position: [250, 400]
    }
};

const sampleActors: Actor[] = [
    {
        id: "innkeeper",
        name: "Innkeeper",
        dialogIds: ["innkeeper_vip", "innkeeper_greeting"]
    },
    {
        id: "guard",
        name: "Guard",
        dialogIds: ["guard_criminal", "guard_friendly", "guard_halt"]
    }
];

export { dialogLibrary, sampleActors };