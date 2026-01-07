# 🌿 NORML Academy Quiz

> **Busting myths.** Prohibition is failing, test your knowledge.

This project is an interactive web application developed for **NORML France**. It is an educational quiz designed to inform the general public about cannabis (History, Law, Health, Politics) through a fun, modern, and multilingual interface.

![Vue.js](https://img.shields.io/badge/vuejs-%2335495e.svg?style=for-the-badge&logo=vuedotjs&logoColor=%234FC08D)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![SASS](https://img.shields.io/badge/SASS-hotpink.svg?style=for-the-badge&logo=SASS&logoColor=white)

## ✨ Features

- **⚡ Modern Stack:** Vue 3 (Composition API), Vite, and TypeScript for maximum performance.
- **🌍 Internationalization (i18n):** Native support for French, English, and Spanish.
- **🔀 Smart Randomization:**
  - Questions are shuffled every game.
  - Answer options are shuffled (impossible to memorize by position).
- **🏆 Score & Ranking System:** Local storage of scores and Leaderboard.
- **🎨 Polished UI/UX:** Activist and elegant design, fluid animations, confetti, responsive design.
- **📚 Educational Content:** Detailed explanations after each answer to maximize learning.

## 🛠️ Prerequisites

Before you begin, ensure you have met the following requirements:

- [Node.js](https://nodejs.org/) (LTS version recommended, v18+)
- [Git](https://git-scm.com/)

## 🚀 Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/10lexik/norml-trvknn.git]
    cd norml-trvknn
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:5173`.

## 📂 Project Structure

```text
src/
├── assets/          # Static assets and images
├── locales/         # 🟢 Translation files (Question Database)
│   ├── fr.json
│   ├── en.json
│   └── es.json
├── App.vue          # Main component (Game Logic)
├── main.ts          # Entry point & i18n initialization
├── style.css        # Global styles
└── vite-env.d.ts    # TypeScript declarations for Vite
```
