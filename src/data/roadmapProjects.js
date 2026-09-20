// Starter project catalog — source of truth for supabase/seed.sql.
//
// The app itself never imports this file at runtime; once projects
// live in Supabase (see src/lib/projectsStore.js), this is just the
// human-editable source that scripts/generate-seed.mjs turns into SQL
// INSERT statements. Edit here, then regenerate with:
//
//   node scripts/generate-seed.mjs > supabase/seed.sql
//
// Descriptions and requirements are written in our own words, inspired
// by the kind of practice-project ideas found on roadmap.sh's Projects
// tab (https://roadmap.sh/projects) — titles and general scope only,
// not copied text.

const roadmapProjects = [
  {
    slug: "task-tracker",
    title: "Task Tracker",
    category: "CLI",
    difficulty: "Beginner",
    roles: ["Backend", "Frontend"],
    tags: ["Programming Language", "CLI", "Filesystem"],
    shortDescription: "Build a CLI app to track your tasks and manage your to-do list.",
    fullDescription:
      "Task Tracker is a project used to track and manage your tasks. In this project you'll build a command-line interface (CLI) to record what you need to do, what you've done, and what you're currently working on. It's a good way to practice core programming skills — working with the filesystem, handling user input, and structuring a small CLI application.",
    requirements: [
      "Add, update, and delete tasks",
      "Mark a task as in progress or done",
      "List all tasks",
      "List all tasks that are done",
      "List all tasks that are not done",
      "List all tasks that are in progress",
    ],
    constraints: [
      "You can use any programming language to build this project",
      "Use positional arguments in the command line to accept user input",
      "Use a JSON file to store the tasks in the current directory",
      "The JSON file should be created if it doesn't already exist",
      "Use the native filesystem module of your language — no external libraries or frameworks",
      "Handle errors and edge cases gracefully",
    ],
  },
  {
    slug: "github-user-activity",
    title: "GitHub User Activity",
    category: "CLI",
    difficulty: "Beginner",
    roles: ["Backend", "DevOps"],
    tags: ["API", "CLI", "JSON"],
    shortDescription: "Use the GitHub API to fetch a user's activity and display it in the terminal.",
    fullDescription:
      "Build a CLI tool that fetches a GitHub user's recent activity from the public GitHub API and prints a readable summary in the terminal — new commits, opened issues, starred repositories, and more.",
    requirements: [
      "Accept a GitHub username as a command-line argument",
      "Fetch the user's recent public activity from the GitHub API",
      "Display the activity in the terminal in a readable, human-friendly format",
      "Handle API failures and invalid usernames gracefully",
    ],
    constraints: [
      "You can use any programming language to build this project",
      "Do not use a GitHub SDK — call the REST API directly",
      "Cache nothing between runs; each run should fetch fresh data",
    ],
  },
  {
    slug: "expense-tracker",
    title: "Expense Tracker",
    category: "CLI",
    difficulty: "Beginner",
    roles: ["Backend", "Data Analyst"],
    tags: ["CLI", "Filesystem", "Finance"],
    shortDescription: "Build a simple expense tracker to manage your finances.",
    fullDescription:
      "A small CLI application to record expenses, categorize them, and summarize spending over time. Good practice for working with persistent local storage and basic reporting logic.",
    requirements: [
      "Add, update, and delete expenses",
      "View a summary of all expenses",
      "View a summary of expenses for a specific month",
      "Set and track a monthly budget",
      "Categorize expenses and filter by category",
    ],
    constraints: [
      "You can use any programming language to build this project",
      "Store expenses in a local JSON or CSV file",
      "Do not use a database engine — flat file storage only",
      "Handle invalid input gracefully",
    ],
  },
  {
    slug: "number-guessing-game",
    title: "Number Guessing Game",
    category: "CLI",
    difficulty: "Beginner",
    roles: ["Backend"],
    tags: ["Programming Language", "CLI"],
    shortDescription: "Build a simple number guessing game to test your luck.",
    fullDescription:
      "The computer picks a random number in a range and the player has a limited number of attempts to guess it, with hints (higher/lower) after each try. A classic first project for practicing control flow and input handling.",
    requirements: [
      "Generate a random number in a configurable range",
      "Accept guesses from the player and give higher/lower feedback",
      "Limit the number of attempts and track the player's score",
      "Offer to play again at the end of a round",
    ],
    constraints: [
      "You can use any programming language to build this project",
      "No external libraries beyond the language's standard library",
    ],
  },
  {
    slug: "unit-converter",
    title: "Unit Converter",
    category: "Web App",
    difficulty: "Beginner",
    roles: ["Frontend"],
    tags: ["Web App", "UI"],
    shortDescription: "A unit converter to convert between different units of measurement.",
    fullDescription:
      "Build a small web app that converts values between units — length, weight, temperature, and volume — with a live-updating result as the user types.",
    requirements: [
      "Support at least length, weight, and temperature conversions",
      "Update the converted value as the user types, without a page reload",
      "Validate numeric input and show a helpful error for invalid values",
    ],
    constraints: [
      "Any frontend stack is fine — plain HTML/CSS/JS or a framework",
      "All conversion logic should run in the browser, no backend required",
    ],
  },
  {
    slug: "personal-blog",
    title: "Personal Blog",
    category: "Web App",
    difficulty: "Beginner",
    roles: ["Frontend", "Backend"],
    tags: ["Web App", "Database", "Authentication"],
    shortDescription: "Build a personal blog to write and publish articles on various topics.",
    fullDescription:
      "A small full-stack blogging platform: write posts, publish them, and let visitors read and comment. A good first project for combining a frontend, a backend, and a database.",
    requirements: [
      "Create, edit, publish, and delete blog posts",
      "A public page listing published posts, and a page to read a single post",
      "Basic authentication so only the author can create or edit posts",
      "Store posts in a database, not in memory",
    ],
    constraints: [
      "Any stack is fine as long as it includes a real backend and a database",
      "Passwords, if any, must be hashed — never stored in plain text",
    ],
  },
  {
    slug: "url-shortener",
    title: "URL Shortener",
    category: "API",
    difficulty: "Intermediate",
    roles: ["Backend", "DevOps"],
    tags: ["API", "Database", "Backend"],
    shortDescription: "Build a backend service that shortens long URLs into short, shareable links.",
    fullDescription:
      "Design and build an API that takes a long URL and returns a short code, then redirects visitors from the short code back to the original URL. Covers routing, persistence, and basic rate limiting.",
    requirements: [
      "An endpoint to create a short link from a long URL",
      "An endpoint that redirects a short code to the original URL",
      "Track the number of times each short link has been visited",
      "Reject invalid URLs with a clear error response",
    ],
    constraints: [
      "Use a real database to persist links (SQL or NoSQL, your choice)",
      "Short codes should be unique and reasonably short",
      "Add basic rate limiting to the creation endpoint",
    ],
  },
  {
    slug: "weather-dashboard",
    title: "Weather Dashboard",
    category: "Web App",
    difficulty: "Intermediate",
    roles: ["Frontend", "Data Analyst"],
    tags: ["API", "Web App", "Data Visualization"],
    shortDescription: "A dashboard that shows current weather and a multi-day forecast for any city.",
    fullDescription:
      "Build a web dashboard that looks up a city, shows current conditions, and charts a multi-day forecast using a public weather API.",
    requirements: [
      "Search for a city and display its current weather",
      "Show a 5-day forecast with a simple chart",
      "Remember the last searched city between visits",
      "Handle cities that don't exist or API errors gracefully",
    ],
    constraints: [
      "Use any public weather API",
      "Any frontend stack is fine",
      "API keys must not be committed to source control",
    ],
  },
  {
    slug: "markdown-editor",
    title: "Markdown Editor",
    category: "Web App",
    difficulty: "Intermediate",
    roles: ["Frontend"],
    tags: ["Web App", "UI"],
    shortDescription: "A live markdown editor with a side-by-side preview pane.",
    fullDescription:
      "Build an editor where the left pane accepts markdown and the right pane renders it live, with support for saving and loading documents locally.",
    requirements: [
      "Live preview that updates as the user types",
      "Support common markdown syntax — headings, lists, code blocks, links, images",
      "Save and load documents from local storage or a file",
      "A toggle between edit, preview, and split views",
    ],
    constraints: [
      "You may use a markdown parsing library, but write the editor UI yourself",
      "Any frontend stack is fine",
    ],
  },
  {
    slug: "ci-pipeline-status-page",
    title: "CI Pipeline Status Page",
    category: "DevOps",
    difficulty: "Advanced",
    roles: ["DevOps", "Backend"],
    tags: ["API", "DevOps", "Database"],
    shortDescription: "A status page that aggregates build results from multiple CI pipelines.",
    fullDescription:
      "Build a service that polls one or more CI providers' APIs and shows a unified status page — build history, pass/fail trends, and average build duration over time.",
    requirements: [
      "Poll at least one CI provider's API for recent build results",
      "Store build history in a database for trend charts",
      "Show pass/fail status and average build duration per pipeline",
      "Auto-refresh the page without a manual reload",
    ],
    constraints: [
      "Use a real database to persist build history",
      "Handle API rate limits from the CI provider gracefully",
      "Any backend and frontend stack is fine",
    ],
  },
];

export default roadmapProjects;
