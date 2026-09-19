import type { ArtifactBlueprint, GeneratedCurriculum } from "@eco/contracts";

/**
 * Hand-checked seed content used by the mock provider so the product can be
 * demonstrated end to end without API keys. Facts verified against NASA
 * public figures; keep it that way if you edit.
 */

export const SOLAR_SYSTEM_CURRICULUM: GeneratedCurriculum = {
  title: "Our Solar System",
  description: "A journey from the Sun outward: what the solar system is, how the planets differ, and what else is out there.",
  topics: [
    {
      slug: "what-is-the-solar-system",
      title: "What Is the Solar System?",
      description: "The Sun, the eight planets, and how gravity keeps everything moving in orbits.",
      difficulty: 1,
      prerequisites: [],
      learningObjectives: [
        "Identify the Sun as the centre of the solar system",
        "Name the eight planets in order from the Sun",
        "Explain that gravity keeps planets in orbit",
      ],
    },
    {
      slug: "the-sun",
      title: "The Sun",
      description: "Our star: what it is made of, how big it is, and why it shines.",
      difficulty: 2,
      prerequisites: ["what-is-the-solar-system"],
      learningObjectives: [
        "Identify the Sun as a star",
        "Describe the Sun's size compared with Earth",
        "Explain that the Sun gives Earth light and heat",
      ],
    },
    {
      slug: "the-rocky-planets",
      title: "The Rocky Planets",
      description: "Mercury, Venus, Earth and Mars: the small, solid worlds closest to the Sun.",
      difficulty: 2,
      prerequisites: ["what-is-the-solar-system"],
      learningObjectives: [
        "Name the four rocky planets",
        "Describe one distinctive feature of each rocky planet",
        "Explain why Earth can support life",
      ],
    },
    {
      slug: "jupiter",
      title: "Jupiter",
      description: "The giant of the solar system: its size, its storms, and its many moons.",
      difficulty: 2,
      prerequisites: ["what-is-the-solar-system"],
      learningObjectives: [
        "Identify Jupiter as a gas giant",
        "Explain why Jupiter is much larger than Earth",
        "Recognize the Great Red Spot as a giant storm",
        "Understand that Jupiter has many moons",
      ],
    },
    {
      slug: "saturn-uranus-neptune",
      title: "Saturn, Uranus and Neptune",
      description: "The other giants: rings, sideways spinning, and the windy blue world at the edge.",
      difficulty: 3,
      prerequisites: ["jupiter"],
      learningObjectives: [
        "Identify Saturn by its rings",
        "Describe how Uranus and Neptune differ from Jupiter and Saturn",
        "Order the outer planets by distance from the Sun",
      ],
    },
    {
      slug: "moons-asteroids-comets",
      title: "Moons, Asteroids and Comets",
      description: "The smaller members of the family and where they are found.",
      difficulty: 3,
      prerequisites: ["the-rocky-planets", "jupiter"],
      learningObjectives: [
        "Explain what a moon is",
        "Locate the asteroid belt between Mars and Jupiter",
        "Describe what makes a comet grow a tail",
      ],
    },
    {
      slug: "solar-system-review",
      title: "Solar System Review",
      description: "Put it all together: order, sizes, and the big ideas.",
      difficulty: 3,
      prerequisites: ["saturn-uranus-neptune", "moons-asteroids-comets"],
      learningObjectives: [
        "Order all eight planets from the Sun",
        "Compare rocky planets with gas and ice giants",
        "Explain how gravity organizes the solar system",
      ],
    },
  ],
};

export const SOLAR_SYSTEM_BLUEPRINTS: Record<string, ArtifactBlueprint> = {
  "what-is-the-solar-system": {
    schemaVersion: 1,
    topicSlug: "what-is-the-solar-system",
    title: "What Is the Solar System?",
    audience: { age: 8, readingLevel: "developing" },
    theme: { primary: "#1d4ed8", accent: "#f59e0b", background: "#f8fafc", mood: "cosmic and calm", emoji: "🌌" },
    learningObjectives: [
      { code: "lo1", text: "Identify the Sun as the centre of the solar system" },
      { code: "lo2", text: "Name the eight planets in order from the Sun" },
      { code: "lo3", text: "Explain that gravity keeps planets in orbit" },
    ],
    stages: ["discover", "understand", "recognize", "practice", "apply"],
    personalization: "Uses a 'team' framing: the Sun as the captain and the planets as the crew.",
    sections: [
      {
        type: "intro", id: "intro", title: "A family of worlds", stage: "discover",
        body: "Those bright dots at night are not all stars. Some are planets in Earth's family: the solar system.",
        hook: "If the Sun were a basketball, Earth would be a peppercorn. How far away would it sit?",
      },
      {
        type: "explore", id: "map", title: "Tap a world", stage: "discover",
        lead: "The Sun sits in the middle. Planets travel around it. Tap one.",
        prompt: "Tap the Sun or a planet",
        visual: {
          kind: "orbit", caption: "Not to scale",
          items: [
            { id: "sun", label: "Sun", description: "The star at the centre. Its gravity holds the whole family together.", emoji: "☀️", color: "#f59e0b" },
            { id: "mercury", label: "Mercury", description: "Smallest planet and closest to the Sun.", emoji: "🪨", color: "#a8a29e" },
            { id: "venus", label: "Venus", description: "Hottest planet, wrapped in thick cloudy air.", emoji: "🌕", color: "#fde68a" },
            { id: "earth", label: "Earth", description: "Our home — the only planet with liquid water oceans.", emoji: "🌍", color: "#3b82f6" },
            { id: "mars", label: "Mars", description: "The dusty red planet, fourth from the Sun.", emoji: "🔴", color: "#ef4444" },
            { id: "jupiter", label: "Jupiter", description: "The biggest planet of all, a giant ball of gas.", emoji: "🟠", color: "#f97316" },
            { id: "saturn", label: "Saturn", description: "The planet famous for its bright rings.", emoji: "🪐", color: "#fbbf24" },
            { id: "uranus", label: "Uranus", description: "An ice giant that spins on its side.", emoji: "🔵", color: "#22d3ee" },
            { id: "neptune", label: "Neptune", description: "Farthest planet: windy, deep blue, and very cold.", emoji: "🌀", color: "#2563eb" },
          ],
        },
      },
      {
        type: "explain", id: "center", title: "Why they stay", stage: "understand",
        paragraphs: [
          "The Sun is so heavy that its gravity pulls on everything else, bending each planet's path into an orbit.",
        ],
        analogy: "Like a team captain in the middle of the field: every player runs a lap around them and nobody drifts off.",
        visual: {
          kind: "sequence", caption: "Order from the Sun",
          items: [
            { id: "m", label: "Mercury", description: "Closest", emoji: "🪨", color: "#a8a29e" },
            { id: "v", label: "Venus", description: "Second", emoji: "🌕", color: "#fde68a" },
            { id: "e", label: "Earth", description: "Third — us", emoji: "🌍", color: "#3b82f6" },
            { id: "r", label: "Mars", description: "Fourth", emoji: "🔴", color: "#ef4444" },
            { id: "j", label: "Jupiter", description: "First giant", emoji: "🟠", color: "#f97316" },
            { id: "s", label: "Saturn", description: "Ringed giant", emoji: "🪐", color: "#fbbf24" },
            { id: "u", label: "Uranus", description: "Sideways spinner", emoji: "🔵", color: "#22d3ee" },
            { id: "n", label: "Neptune", description: "Farthest", emoji: "🌀", color: "#2563eb" },
          ],
        },
      },
      {
        type: "review", id: "review", title: "What we discovered", stage: "understand",
        bullets: [
          "The solar system is the Sun and everything that orbits it.",
          "Eight planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.",
          "The Sun's gravity keeps the planets on their orbits.",
        ],
        nextStep: "Ready for a quick quiz?",
      },
      {
        type: "quiz", id: "quiz", title: "Check what you know", stage: "practice",
        intro: "Now let's see what you remember.",
        questions: [
          {
            kind: "mcq", id: "q1", prompt: "What is at the centre of the solar system?", difficulty: 1, objectiveCodes: ["lo1"],
            options: [{ id: "a", text: "Earth" }, { id: "b", text: "The Sun" }, { id: "c", text: "The Moon" }, { id: "d", text: "Jupiter" }],
            correctOptionId: "b", hint: "It is the brightest and heaviest thing in the whole system.",
            explanation: "The Sun sits at the centre. It holds more than 99% of all the mass in the solar system, so everything else orbits around it.",
          },
          {
            kind: "ordering", id: "q2", prompt: "Put these planets in order, starting closest to the Sun.", difficulty: 2, objectiveCodes: ["lo2"],
            items: [{ id: "e", text: "Earth" }, { id: "m", text: "Mercury" }, { id: "j", text: "Jupiter" }, { id: "v", text: "Venus" }],
            correctOrder: ["m", "v", "e", "j"], hint: "Mercury is the closest. Jupiter is past the rocky planets.",
            explanation: "From the Sun outward the order is Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune. Mercury is closest and Jupiter is the first giant planet.",
          },
          {
            kind: "true_false", id: "q3", prompt: "Planets stay in their orbits because of gravity.", answer: true, difficulty: 1, objectiveCodes: ["lo3"],
            explanation: "Yes. The Sun's gravity pulls each planet toward it while the planet keeps moving forward, so it follows a curved orbit instead of flying off into space.",
          },
          {
            kind: "short_answer", id: "q4", prompt: "Which planet is farthest from the Sun?", acceptedAnswers: ["Neptune"], difficulty: 2, objectiveCodes: ["lo2"],
            hint: "It is blue, windy, and last in the list.",
            explanation: "Neptune is the eighth and farthest planet from the Sun. It is so far away that sunlight takes over four hours to reach it.",
          },
          {
            kind: "mcq", id: "q5", prompt: "If the Sun lost its gravity but kept shining, Earth would most likely...", difficulty: 3, objectiveCodes: ["lo3"],
            options: [{ id: "a", text: "Keep orbiting in the same circle" }, { id: "b", text: "Travel off in a straight line into space" }, { id: "c", text: "Fall straight into the Sun" }],
            correctOptionId: "b", hint: "What happens when you let go of a ball on a string?",
            explanation: "Gravity is what bends Earth's path into an orbit. Without it, Earth would continue in a straight line.",
          },
        ],
      },
    ],
  },

  jupiter: {
    schemaVersion: 1,
    topicSlug: "jupiter",
    title: "Jupiter",
    audience: { age: 8, readingLevel: "developing" },
    theme: { primary: "#b45309", accent: "#dc2626", background: "#fffbeb", mood: "warm, swirling, enormous", emoji: "🪐" },
    learningObjectives: [
      { code: "lo1", text: "Identify Jupiter as a gas giant" },
      { code: "lo2", text: "Explain why Jupiter is much larger than Earth" },
      { code: "lo3", text: "Recognize the Great Red Spot as a giant storm" },
      { code: "lo4", text: "Understand that Jupiter has many moons" },
    ],
    stages: ["discover", "understand", "recognize", "practice", "apply"],
    personalization: "Jupiter is framed as 'the giant of the team'; size comparisons use everyday objects.",
    sections: [
      {
        type: "intro", id: "intro", title: "Meet the giant", stage: "discover",
        body: "Jupiter is the biggest planet. Every other planet could fit inside it — but you could never stand on it.",
        hook: "Why can't you stand on the biggest planet there is?",
      },
      {
        type: "explore", id: "size", title: "How huge is huge?", stage: "discover",
        lead: "Tap each world. Watch how Jupiter dwarfs Earth.",
        prompt: "Tap a planet to compare",
        visual: {
          kind: "comparison", caption: "Width compared with Earth (Earth = 1)",
          items: [
            { id: "earth", label: "Earth", description: "Our home, about 12,700 km across.", value: 1, emoji: "🌍", color: "#3b82f6" },
            { id: "neptune", label: "Neptune", description: "Almost 4 Earths wide.", value: 3.9, emoji: "🌀", color: "#2563eb" },
            { id: "saturn", label: "Saturn", description: "About 9 Earths wide.", value: 9.4, emoji: "🪐", color: "#fbbf24" },
            { id: "jupiter", label: "Jupiter", description: "About 11 Earths wide — more than 1,300 Earths would fit inside.", value: 11.2, emoji: "🟠", color: "#ea580c" },
          ],
        },
      },
      {
        type: "explain", id: "gas", title: "A planet made of gas", stage: "understand",
        paragraphs: [
          "Jupiter is a gas giant: mostly hydrogen and helium, with no solid ground to land on.",
          "The Great Red Spot is a storm wider than Earth, swirling for hundreds of years. Jupiter also has more than 90 moons.",
        ],
        analogy: "Earth next to Jupiter looks like a marble beside a beach ball.",
        visual: {
          kind: "parts", caption: "Jupiter's four biggest moons",
          items: [
            { id: "io", label: "Io", description: "Covered in active volcanoes.", emoji: "🌋", color: "#f97316" },
            { id: "europa", label: "Europa", description: "An icy shell with an ocean below.", emoji: "🧊", color: "#7dd3fc" },
            { id: "ganymede", label: "Ganymede", description: "The largest moon in the solar system.", emoji: "🌑", color: "#78716c" },
            { id: "callisto", label: "Callisto", description: "Old and covered in craters.", emoji: "🪨", color: "#a8a29e" },
          ],
        },
      },
      {
        type: "review", id: "review", title: "What we discovered", stage: "understand",
        bullets: [
          "Jupiter is a gas giant with no solid surface.",
          "About 11 Earths would fit across it.",
          "The Great Red Spot is a storm wider than Earth.",
          "It has many moons; the four biggest are Io, Europa, Ganymede and Callisto.",
        ],
        nextStep: "Ready for a quick quiz?",
      },
      {
        type: "quiz", id: "quiz", title: "Check what you know", stage: "practice",
        questions: [
          {
            kind: "mcq", id: "q1", prompt: "Why can't you stand on Jupiter?", difficulty: 1, objectiveCodes: ["lo1"],
            options: [{ id: "a", text: "It is too cold" }, { id: "b", text: "It has no solid surface" }, { id: "c", text: "It spins too fast" }],
            correctOptionId: "b", hint: "Think about what Jupiter is made of.",
            explanation: "Jupiter is a gas giant made mostly of hydrogen and helium. There is no ground; the gas just gets thicker and hotter the deeper you go.",
          },
          {
            kind: "true_false", id: "q2", prompt: "More than 1,000 Earths could fit inside Jupiter.", answer: true, difficulty: 2, objectiveCodes: ["lo2"],
            explanation: "True. Jupiter is about 11 Earths wide, and because volume grows very fast with width, roughly 1,300 Earths would fit inside it.",
          },
          {
            kind: "mcq", id: "q3", prompt: "What is the Great Red Spot?", difficulty: 2, objectiveCodes: ["lo3"],
            options: [{ id: "a", text: "A volcano" }, { id: "b", text: "A moon" }, { id: "c", text: "A giant storm" }, { id: "d", text: "A crater" }],
            correctOptionId: "c", hint: "It moves and swirls.",
            explanation: "The Great Red Spot is an enormous storm in Jupiter's clouds. It has been raging for at least 150 years and is wider than our whole planet.",
          },
          {
            kind: "short_answer", id: "q4", prompt: "Name one of Jupiter's four biggest moons.", acceptedAnswers: ["Io", "Europa", "Ganymede", "Callisto"], difficulty: 2, objectiveCodes: ["lo4"],
            hint: "One is icy, one is volcanic, one is the biggest moon anywhere.",
            explanation: "Jupiter's four largest moons are Io, Europa, Ganymede and Callisto. Galileo saw them in 1610.",
          },
          {
            kind: "mcq", id: "q5", prompt: "A probe is looking for life. Which moon is the most promising, and why?", difficulty: 3, objectiveCodes: ["lo4"],
            options: [{ id: "a", text: "Io, because volcanoes keep it warm" }, { id: "b", text: "Europa, because it may have a liquid ocean under its ice" }, { id: "c", text: "Callisto, because it is the oldest" }],
            correctOptionId: "b", hint: "Life as we know it needs liquid water.",
            explanation: "Europa is the top candidate because there is strong evidence of a salty liquid ocean beneath its icy shell.",
          },
        ],
      },
    ],
  },

  "the-sun": {
    schemaVersion: 1,
    topicSlug: "the-sun",
    title: "The Sun",
    audience: { age: 8, readingLevel: "developing" },
    theme: { primary: "#c2410c", accent: "#facc15", background: "#fffbeb", mood: "bright and warm", emoji: "☀️" },
    learningObjectives: [
      { code: "lo1", text: "Identify the Sun as a star" },
      { code: "lo2", text: "Describe the Sun's size compared with Earth" },
      { code: "lo3", text: "Explain that the Sun gives Earth light and heat" },
    ],
    stages: ["discover", "understand", "recognize", "practice"],
    sections: [
      {
        type: "intro", id: "intro", title: "Our very own star", stage: "discover",
        body: "Every star at night is a sun, just very far away. Ours is close enough to warm your face.",
        hook: "Sunlight on your skin left the Sun about eight minutes ago.",
      },
      {
        type: "explore", id: "size", title: "A giant ball of light", stage: "discover",
        lead: "Tap each circle. The Sun is in a different league.",
        prompt: "Tap Earth, Jupiter, then the Sun",
        visual: {
          kind: "comparison", caption: "Width compared with Earth (Earth = 1)",
          items: [
            { id: "earth", label: "Earth", description: "1 Earth wide — that's us.", value: 1, emoji: "🌍", color: "#3b82f6" },
            { id: "jupiter", label: "Jupiter", description: "About 11 Earths wide, the biggest planet.", value: 11, emoji: "🪐", color: "#ea580c" },
            { id: "sun", label: "Sun", description: "About 109 Earths wide. More than a million Earths would fit inside.", value: 109, emoji: "☀️", color: "#f59e0b" },
          ],
        },
      },
      {
        type: "explain", id: "star", title: "Why it shines", stage: "understand",
        paragraphs: [
          "The Sun is a star: a huge ball of glowing gas, mostly hydrogen and helium. Deep inside, hydrogen turns into helium and releases the light and heat that reach Earth.",
        ],
        visual: {
          kind: "simulation", caption: "Light's trip to Earth",
          items: [
            { id: "core", label: "Core", description: "Hydrogen is squeezed so hard it becomes helium and energy.", emoji: "🔥", color: "#f97316" },
            { id: "surface", label: "Surface", description: "That energy escapes as sunlight.", emoji: "☀️", color: "#facc15" },
            { id: "earth", label: "Earth", description: "About eight minutes later, it warms our planet.", emoji: "🌍", color: "#3b82f6" },
          ],
        },
      },
      {
        type: "review", id: "review", title: "What we discovered", stage: "understand",
        bullets: [
          "The Sun is a star, a giant ball of hot gas.",
          "It is about 109 times wider than Earth.",
          "Its light and heat make life on Earth possible.",
        ],
        nextStep: "Ready for a quick quiz?",
      },
      {
        type: "quiz", id: "quiz", title: "Check what you know", stage: "practice",
        questions: [
          {
            kind: "true_false", id: "q1", prompt: "The Sun is a planet.", answer: false, difficulty: 1, objectiveCodes: ["lo1"],
            explanation: "The Sun is a star, not a planet. Stars make their own light from hot gas, while planets only reflect light from a star.",
          },
          {
            kind: "mcq", id: "q2", prompt: "About how many Earths would fit across the Sun?", difficulty: 2, objectiveCodes: ["lo2"],
            options: [{ id: "a", text: "About 10" }, { id: "b", text: "About 109" }, { id: "c", text: "About 1,000" }],
            correctOptionId: "b", hint: "It is more than Jupiter's 11 but far less than a thousand.",
            explanation: "The Sun is about 109 Earths wide. Because it is a sphere, that means over a million Earths would fit inside it.",
          },
          {
            kind: "short_answer", id: "q3", prompt: "Name one thing the Sun gives Earth.", acceptedAnswers: ["light", "heat", "warmth", "energy", "sunlight", "light and heat"], difficulty: 1, objectiveCodes: ["lo3"],
            explanation: "The Sun gives Earth light and heat. Without it, Earth would be dark and frozen, and plants could not grow.",
          },
        ],
      },
    ],
  },
};
