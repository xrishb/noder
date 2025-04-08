# Noder

![Noder Logo](public/favicon.svg)

Noder is an AI-powered platform that transforms natural language into production-ready Unreal Engine 5 Blueprints. It allows game developers to generate complex blueprint diagrams through simple text descriptions, significantly reducing development time and technical barriers.

## 🌟 Features

- **Natural Language to Blueprint**: Describe your game mechanics in plain English and get fully functional Unreal Engine blueprints
- **Interactive Blueprint Editor**: Visualize, edit, and customize generated blueprints
- **Project Management**: Organize your blueprints into projects for better workflow
- **Export Functionality**: Export blueprints for direct import into Unreal Engine
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Firebase account (for authentication and data storage)
- A Gemini API key (for AI blueprint generation)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/noder.git
   cd noder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   # Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key

   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
noder/
├── api/                  # Backend API (Vercel serverless functions)
│   ├── index.py          # Main API handler
│   └── requirements.txt  # Python dependencies
├── public/               # Static assets
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services
│   ├── store/            # State management
│   ├── types/            # TypeScript type definitions
│   └── App.tsx           # Main application component
├── .env                  # Environment variables
├── package.json          # Node.js dependencies
├── vercel.json           # Vercel deployment configuration
└── vite.config.ts        # Vite configuration
```

## 🚀 Deployment

Noder is configured for easy deployment on Vercel:

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect your repository to Vercel
3. Configure the following environment variables in your Vercel project settings:
   - `GEMINI_API_KEY`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Deploy your project

## 🔧 Usage

1. **Create an Account**: Sign up using your email or Google account
2. **Create a Project**: Start by creating a new project to organize your blueprints
3. **Generate Blueprints**: Use the natural language input to describe your game mechanics
4. **Edit Blueprints**: Customize the generated blueprints in the interactive editor
5. **Export Blueprints**: Export your blueprints for use in Unreal Engine

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [React Flow](https://reactflow.dev/)
- [Firebase](https://firebase.google.com/)
- [Google Gemini AI](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
