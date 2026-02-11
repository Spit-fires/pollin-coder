/**
 * Export generated React apps as downloadable ZIP files
 * Creates a fully-configured Vite + React + TypeScript project
 */

import JSZip from "jszip";
import { shadcnFiles, dependencies } from "./sandpack-files";
import { extractAllCodeBlocks } from "./utils";

/**
 * Export a generated app as a ZIP file containing a complete Vite project
 */
export async function exportProjectAsZip(appCode: string, projectName: string = "pollin-app"): Promise<void> {
  const zip = new JSZip();

  // Extract all files from the code
  const blocks = extractAllCodeBlocks(appCode);
  const multiFiles: Record<string, string> = {};
  
  if (blocks.length > 0) {
    blocks.forEach(block => {
      if (block.filename) {
        multiFiles[block.filename] = block.code;
      }
    });
  }

  // Fallback: if no named files, use the first block as App.tsx
  // or use the whole thing as App.tsx (legacy)
  const mainCode = multiFiles["App.tsx"] || (blocks[0]?.code ?? appCode);

  // Add user's generated App component (if it wasn't already added in multiFiles)
  zip.file("src/App.tsx", mainCode);

  // Add all other multi-files to src/
  for (const [path, content] of Object.entries(multiFiles)) {
    if (path !== "App.tsx") {
      // Ensure the path is within src/ and doesn't start with /
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      zip.file(`src/${cleanPath}`, content);
    }
  }

  // Add React entry point
  zip.file(
    "src/main.tsx",
    `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`
  );

  // Add Tailwind-enabled index.css
  zip.file(
    "src/index.css",
    `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`
  );

  // Add all shadcn UI components
  for (const [path, content] of Object.entries(shadcnFiles)) {
    if (path.startsWith("/")) {
      // Convert absolute paths to src-relative
      zip.file(`src${path}`, content);
    }
  }

  // Add HTML template
  zip.file(
    "index.html",
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
  );

  // Add package.json with all dependencies
  zip.file(
    "package.json",
    JSON.stringify(
      {
        name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "tsc && vite build",
          lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
          preview: "vite preview",
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          ...dependencies,
        },
        devDependencies: {
          "@types/react": "^18.2.66",
          "@types/react-dom": "^18.2.22",
          "@typescript-eslint/eslint-plugin": "^7.2.0",
          "@typescript-eslint/parser": "^7.2.0",
          "@vitejs/plugin-react": "^4.2.1",
          autoprefixer: "^10.4.19",
          eslint: "^8.57.0",
          "eslint-plugin-react-hooks": "^4.6.0",
          "eslint-plugin-react-refresh": "^0.4.6",
          postcss: "^8.4.38",
          tailwindcss: "^3.4.3",
          typescript: "^5.2.2",
          vite: "^5.2.0",
        },
      },
      null,
      2
    )
  );

  // Add TypeScript config
  zip.file(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
          baseUrl: ".",
          paths: {
            "@/*": ["./src/*"],
          },
        },
        include: ["src"],
        references: [{ path: "./tsconfig.node.json" }],
      },
      null,
      2
    )
  );

  zip.file(
    "tsconfig.node.json",
    JSON.stringify(
      {
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: "ESNext",
          moduleResolution: "bundler",
          allowSyntheticDefaultImports: true,
        },
        include: ["vite.config.ts"],
      },
      null,
      2
    )
  );

  // Add Vite config
  zip.file(
    "vite.config.ts",
    `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
`
  );

  // Add Tailwind config
  zip.file(
    "tailwind.config.js",
    `/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
`
  );

  // Add PostCSS config
  zip.file(
    "postcss.config.js",
    `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`
  );

  // Add README
  zip.file(
    "README.md",
    `# ${projectName}

Generated by [Pollin Coder](https://github.com/yourusername/pollin-coder)

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit http://localhost:5173 to view your app.

## Build

\`\`\`bash
npm run build
\`\`\`

The built app will be in the \`dist/\` folder.
`
  );

  // Add .gitignore
  zip.file(
    ".gitignore",
    `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`
  );

  // Generate the zip
  const blob = await zip.generateAsync({ type: "blob" });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
